import { createClient } from '@supabase/supabase-js';
import { MemberService } from '../src/lib/services/member-service';
import { SavingsService } from '../src/lib/services/savings-service';
import { AccountCode } from '../src/lib/types/ledger';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Testing Member Resignation ---');

    // 1. Setup Context
    const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    if (!koperasi) {
        console.error('No Koperasi found');
        process.exit(1);
    }
    
    console.log(`Koperasi ID: ${koperasi.id}`);

    // 2. Find a Test Member without outstanding loans
    let memberId: string;
    let userId: string;

    // Get IDs of members with active loans
    const { data: loans, error: loansError } = await supabase.from('loans').select('member_id').in('status', ['active']);
    if (loansError) {
        console.error('Error fetching loans:', loansError);
        process.exit(1);
    }
    const memberIdsWithLoans = new Set(loans?.map((l: any) => l.member_id));

    // Get an active member NOT in that set
    const { data: members } = await supabase.from('member').select('id, user_id').eq('koperasi_id', koperasi.id).eq('status', 'active').limit(50);
    const existingMember = members?.find((m: any) => !memberIdsWithLoans.has(m.id));

    if (existingMember) {
        memberId = existingMember.id;
        userId = existingMember.user_id;
        console.log(`Using existing active member (clean): ${memberId}`);
    } else {
        // Create dummy member
        console.log('Creating dummy member...');
        
        // Create a new auth user
        const email = `test.resign.${Date.now()}@example.com`;
        const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
            email: email,
            password: 'password123',
            email_confirm: true
        });

        if (userError || !newUser.user) {
            console.error('Failed to create auth user:', userError);
            process.exit(1);
        }
        userId = newUser.user.id;
        console.log(`Created new auth user: ${userId}`);

        const { data: newMember, error } = await supabase.from('member').insert({
            koperasi_id: koperasi.id,
            user_id: userId,
            nomor_anggota: `TEST-${Date.now()}`,
            nama_lengkap: 'Test Resign Member',
            nik: `3201${Date.now()}`,
            phone: '081234567890',
            alamat_lengkap: 'Jl. Test No. 123',
            status: 'active',
            tanggal_daftar: new Date().toISOString()
        }).select().single();
        
        if (error) {
            console.error('Failed to create member:', error);
            process.exit(1);
        }
        memberId = newMember.id;
        console.log(`Created new member: ${memberId}`);
    }

    // 3. Ensure Savings Account with Balance
    const savingsService = new SavingsService(supabase);
    
    // Get Voluntary Product
    const { data: product } = await supabase.from('savings_products')
        .select('id')
        .eq('koperasi_id', koperasi.id)
        .eq('type', 'sukarela')
        .single();
        
    if (!product) {
        console.error('No voluntary savings product found');
        process.exit(1);
    }

    // Get or Create Account
    let { data: account } = await supabase.from('savings_accounts')
        .select('id')
        .eq('member_id', memberId)
        .eq('product_id', product.id)
        .single();

    if (!account) {
        const { data: newAcc, error } = await supabase.from('savings_accounts').insert({
            koperasi_id: koperasi.id,
            member_id: memberId,
            product_id: product.id,
            account_number: `SAV-${Date.now()}`,
            balance: 0,
            status: 'active'
        }).select().single();
        
        if (error) {
             console.error('Failed to create savings account:', error);
             process.exit(1);
        }
        account = newAcc;
    } else {
        // Ensure active
        await supabase.from('savings_accounts').update({ status: 'active' }).eq('id', account.id);
    }

    // Deposit some money
    if (!account) throw new Error('Savings account not found for resignation test');
    console.log(`Depositing 100,000 to account ${account.id}...`);
    await savingsService.processTransaction(
        account.id,
        100000,
        'deposit',
        userId,
        'Initial Deposit for Resignation Test'
    );

    // 4. Run Resignation
    console.log('Running Resignation...');
    const memberService = new MemberService(supabase);
    
    try {
        const result = await memberService.resignMember(
            memberId,
            koperasi.id,
            'Testing Resignation',
            userId,
            'cash'
        );
        
        console.log('Resignation Result:', result);
        
        // 5. Verify
         // A. Member Status
         const { data: updatedMember, error: verifyError } = await supabase.from('member').select('status').eq('id', memberId).single();
         if (verifyError) {
             console.error('Error verifying member status:', verifyError);
         }
        console.log('Updated Member Status:', updatedMember?.status);
         const validStatuses = ['resigned', 'inactive'];
         if (!validStatuses.includes(updatedMember?.status)) throw new Error(`Member status not updated. Expected one of ${validStatuses.join(', ')}, got ${updatedMember?.status}`);

        // B. Savings Status & Balance
        const { data: updatedAccount } = await supabase.from('savings_accounts').select('status, balance').eq('id', account.id).single();
        console.log('Updated Account:', updatedAccount);
        if (updatedAccount?.status !== 'closed') throw new Error('Account status not closed');
        if (updatedAccount?.balance !== 0) throw new Error('Account balance not zeroed');

        // C. Ledger Entry
        // Check for journal entry with reference_type = 'MEMBER_RESIGNATION'
        const { data: journal } = await supabase.from('journals')
            .select('id, description, lines:journal_lines(*)')
            .eq('reference_id', memberId)
            .eq('reference_type', 'MEMBER_RESIGNATION')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        console.log('Journal Entry Found:', journal ? 'Yes' : 'No');
        if (!journal) throw new Error('No journal entry found');
        
        console.log('Journal Lines:', journal.lines.map((l: any) => ({
            account: l.account_id,
            debit: l.debit,
            credit: l.credit
        })));

        console.log('✅ Test Passed!');

    } catch (err: any) {
        console.error('❌ Test Failed:', err.message);
        console.error(err);
    }
}

main();
