import { createClient } from '@supabase/supabase-js';
import { FinancingService } from '../src/lib/services/financing-service';
import { AccountCode } from '../src/lib/types/ledger';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Testing Financing Disbursement (Murabahah) ---');

    // 1. Setup Context
    const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    if (!koperasi) {
        console.error('No Koperasi found');
        process.exit(1);
    }
    const koperasiId = koperasi.id;

    // 2. Create/Get User & Member
    const email = `test.finance.${Date.now()}@example.com`;
    const { data: newUser } = await supabase.auth.admin.createUser({
        email: email,
        password: 'password123',
        email_confirm: true
    });
    const userId = newUser.user!.id;

    const { data: member } = await supabase.from('member').insert({
        koperasi_id: koperasiId,
        user_id: userId,
        nomor_anggota: `FIN-${Date.now()}`,
        nama_lengkap: 'Test Financing Member',
        nik: `3202${Date.now()}`,
        phone: '081298765432',
        alamat_lengkap: 'Jl. Financing Test',
        status: 'active'
    }).select().single();

    // 3. Create Financing Product
    const productCode = `MRB-${Date.now()}`;
    let product;
    
    // Try to create with financing fields
    const { data: p1, error: e1 } = await supabase.from('loan_products').insert({
        koperasi_id: koperasiId,
        name: `Pembiayaan Murabahah ${productCode}`,
        code: productCode,
        interest_rate: 20, // 20% flat per year
        max_amount: 10000000,
        max_tenor_months: 12,
        is_active: true,
        is_financing: true,
        description: 'Pembiayaan elektronik'
    }).select().single();

    if (e1 && e1.message.includes('column')) {
        console.warn('Migration missing for is_financing. Creating basic product.');
        const { data: p2, error: e2 } = await supabase.from('loan_products').insert({
            koperasi_id: koperasiId,
            name: `Pembiayaan Murabahah ${productCode}`,
            code: productCode,
            interest_rate: 20,
            max_amount: 10000000,
            max_tenor_months: 12,
            is_active: true,
            description: 'Pembiayaan elektronik (Basic)'
        }).select().single();
        
        if (e2) {
             console.error('Failed to create basic product:', e2);
             process.exit(1);
        }
        product = p2;
    } else if (e1) {
        console.error('Failed to create product:', e1);
        process.exit(1);
    } else {
        product = p1;
    }

    // Ensure Accounts Exist for this Koperasi
    const { error: accError } = await supabase.from('accounts').upsert([
        { koperasi_id: koperasiId, code: AccountCode.FINANCING_RECEIVABLE, name: 'Piutang Pembiayaan', type: 'asset', normal_balance: 'DEBIT', is_active: true },
        { koperasi_id: koperasiId, code: AccountCode.CASH_ON_HAND, name: 'Kas Tunai', type: 'asset', normal_balance: 'DEBIT', is_active: true },
        { koperasi_id: koperasiId, code: AccountCode.UNEARNED_FINANCING_INCOME, name: 'Pendapatan Ditangguhkan', type: 'liability', normal_balance: 'CREDIT', is_active: true }
    ], { onConflict: 'koperasi_id, code' });

    if (accError) console.error('Failed to ensure accounts:', accError);

    // 4. Submit Application
    console.log('Submitting Application...');
    const financingService = new FinancingService(supabase);
    
    const price = 5000000;
    const dp = 1000000;
    const financingAmount = price - dp; // 4,000,000
    const tenor = 12;

    const app = await financingService.applyForFinancing({
        koperasi_id: koperasiId,
        member_id: member.id,
        product_id: product.id,
        tenor_months: tenor,
        object_details: {
            category: 'electronics',
            name: 'Laptop Gaming',
            condition: 'new',
            price_otr: price,
            down_payment: dp,
            attributes: { brand: 'Asus' },
            description: 'Laptop for work'
        },
        created_by: userId
    });

    // 5. Approve Application (Manual DB update for speed)
    await supabase.from('loan_applications').update({
        status: 'approved',
        workflow_metadata: { approved_by: userId, approved_at: new Date().toISOString() }
    }).eq('id', app.id);

    // 6. Disburse
    console.log('Disbursing Financing...');
    try {
        const loan = await financingService.disburseFinancing(app.id, userId);
        console.log('Financing Disbursed. Loan ID:', loan.id);
        console.log('Loan Code:', loan.loan_code);

        // 7. Verify Journal
        const { data: journal } = await supabase.from('journals')
            .select('*, lines:journal_lines(*, account:accounts(code, name))')
            .eq('reference_id', loan.id)
            .eq('reference_type', 'FINANCING_DISBURSEMENT')
            .single();

        if (!journal) throw new Error('Journal Entry NOT found');
        console.log('Journal Entry Found:', journal.description);
        
        // Expected amounts
        // Margin = 4,000,000 * 20% * (12/12) = 800,000
        // Total Repayable = 4,800,000
        
        const receivableLine = journal.lines.find((l: any) => l.account.code === AccountCode.FINANCING_RECEIVABLE);
        const cashLine = journal.lines.find((l: any) => l.account.code === AccountCode.CASH_ON_HAND);
        const deferredLine = journal.lines.find((l: any) => l.account.code === AccountCode.UNEARNED_FINANCING_INCOME);

        console.log('Journal Lines:', journal.lines.map((l: any) => `${l.account.code} (${l.debit}/${l.credit})`));

        if (!receivableLine || Number(receivableLine.debit) !== 4800000) throw new Error(`Receivable incorrect. Expected 4800000, got ${receivableLine?.debit}`);
        if (!cashLine || Number(cashLine.credit) !== 4000000) throw new Error(`Cash incorrect. Expected 4000000, got ${cashLine?.credit}`);
        if (!deferredLine || Number(deferredLine.credit) !== 800000) throw new Error(`Deferred Income incorrect. Expected 800000, got ${deferredLine?.credit}`);

        console.log('✅ Financing Disbursement Test Passed!');

    } catch (err: any) {
        console.error('❌ Test Failed:', err.message);
        console.error(err);
    }
}

main().catch(console.error);
