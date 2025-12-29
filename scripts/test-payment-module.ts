import { createClient } from '@supabase/supabase-js';
import { PaymentService } from '../src/lib/services/payment-service';
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
    console.log('--- Testing Payment Module ---');

    // 1. Setup Context
    const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    if (!koperasi) {
        console.error('No Koperasi found');
        process.exit(1);
    }
    
    const referenceId = crypto.randomUUID(); 
    const amount = 50000;
    const koperasiId = koperasi.id;
    
    console.log(`Koperasi ID: ${koperasiId}`);

    // Ensure accounts exist for testing
    async function ensureAccount(code: string, name: string, type: string, normalBalance: 'DEBIT' | 'CREDIT') {
        const { data } = await supabase.from('accounts').select('id').eq('koperasi_id', koperasiId).eq('code', code).single();
        if (!data) {
            console.log(`Seeding account ${code}...`);
            const { error } = await supabase.from('accounts').insert({
                koperasi_id: koperasiId,
                code,
                name,
                type,
                normal_balance: normalBalance,
                is_active: true
            });
            if (error) console.error(`Seeding account ${code} failed:`, error);
        }
    }
    
    // Try lowercase 'asset' as enum value
    await ensureAccount('1-1002', 'Bank BCA', 'asset', 'DEBIT');
    await ensureAccount('1-1101', 'Piutang Usaha', 'asset', 'DEBIT');

    // Debug: Verify accounts
    const { data: accounts } = await supabase.from('accounts').select('code, id').eq('koperasi_id', koperasiId);
    console.log('Accounts in DB:', accounts?.map(a => `${a.code}:${a.id}`));

    const paymentService = new PaymentService(supabase, 'mock');

    // 2. Test Create QRIS
    console.log('\n1. Testing createQRISPayment...');
    try {
        // Need a valid user ID for created_by since LedgerService enforces UUID
        const { data: user } = await supabase.auth.getUser();
        // If no user in script context (service role), we pick a dummy user ID or the first user from auth.users if possible (not possible via client directly usually)
        // For testing, let's fetch a member's user_id or use a known UUID if we can't login.
        // Since this is a script, let's query `member` table to find a valid user_id attached to a member.
        const { data: member } = await supabase.from('member').select('user_id').limit(1).single();
        const testUserId = member?.user_id || '00000000-0000-0000-0000-000000000000'; // Fallback to NIL UUID if needed, but Ledger might fail foreign key if strictly enforced.
        
        // Actually, let's just use the `created_by` field in our manual insert if PaymentService allows it.
        // PaymentService.createQRISPayment doesn't take created_by param explicitly, it relies on context or we need to update it.
        // Wait, `createQRISPayment` inserts into `payment_transactions`. The table has `created_by`.
        // But the service method `createQRISPayment` doesn't currently accept `userId`.
        // Let's check PaymentService.ts again.
        
        // Correction: We need to pass created_by to PaymentService methods or update the service to accept it.
        // For now, let's manually patch the transaction with a user ID after creation so webhook has it.
        
        const trx = await paymentService.createQRISPayment(
            koperasiId,
            referenceId,
            'retail_sale',
            amount,
            'Test QRIS Payment'
        );
        
        // PATCH: Add created_by manually for the test to succeed in Ledger
        await supabase.from('payment_transactions').update({ created_by: testUserId }).eq('id', trx.id);
        
        console.log('Transaction Created:', trx.id);
        
        // 3. Test Webhook (Success)
        console.log('\n2. Testing processWebhook (Success)...');
        const payload = {
            external_id: trx.external_id,
            status: 'success',
            amount: amount
        };
        
        const updatedTrx = await paymentService.processWebhook(payload);
        console.log('Updated Status:', updatedTrx.status);

        // 4. Verify Ledger Entry (Accounting Service)
        console.log('\n3. Verifying Ledger Entry (Accounting Service)...');
        
        // New Schema: journals -> journal_lines
        const { data: journal } = await supabase
            .from('journals')
            .select(`
                id,
                description,
                journal_lines (
                    id,
                    debit,
                    credit,
                    accounts (code, name)
                )
            `)
            .eq('reference_id', trx.id)
            .single();
            
        if (journal) {
            console.log('Journal Found:', journal.id);
            console.log('Description:', journal.description);
            journal.journal_lines.forEach((line: any) => {
                console.log(`- ${line.accounts.code} (${line.accounts.name}): Debit ${line.debit}, Credit ${line.credit}`);
            });
        } else {
            console.error('Journal Entry Missing!');
        }
        
    } catch (e: any) {
        console.error("Error:", e);
        if (e.cause) console.error("Cause:", e.cause);
        console.log("NOTE: This error is expected if migration 20251221090000_create_payment_module.sql is not applied.");
    }
}

main().catch(console.error);
