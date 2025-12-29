import { createClient } from '@supabase/supabase-js';
import { FinancingService } from '../src/lib/services/financing-service';
import { LoanService } from '../src/lib/services/loan-service';
import { AccountCode } from '../src/lib/types/ledger';
import dotenv from 'dotenv';
import path from 'path';

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
    console.log('--- Testing Financing Repayment (Murabahah) ---');

    // 1. Setup Context
    const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    if (!koperasi) { console.error('No Koperasi found'); process.exit(1); }
    const koperasiId = koperasi.id;

    // Ensure Accounts Exist
    const { error: accError } = await supabase.from('accounts').upsert([
        { koperasi_id: koperasiId, code: AccountCode.FINANCING_RECEIVABLE, name: 'Piutang Pembiayaan', type: 'asset', normal_balance: 'DEBIT', is_active: true },
        { koperasi_id: koperasiId, code: AccountCode.CASH_ON_HAND, name: 'Kas Tunai', type: 'asset', normal_balance: 'DEBIT', is_active: true },
        { koperasi_id: koperasiId, code: AccountCode.UNEARNED_FINANCING_INCOME, name: 'Pendapatan Ditangguhkan', type: 'liability', normal_balance: 'CREDIT', is_active: true },
        { koperasi_id: koperasiId, code: AccountCode.FINANCING_INCOME_MARGIN, name: 'Pendapatan Margin Pembiayaan', type: 'revenue', normal_balance: 'CREDIT', is_active: true }
    ], { onConflict: 'koperasi_id, code' });
    if (accError) console.error('Failed to ensure accounts:', accError);

    // 2. Member
    let memberId: string;
    let userId: string;
    
    // Create Dummy Member
    const email = `test.repay.${Date.now()}@example.com`;
    const { data: newUser } = await supabase.auth.admin.createUser({
        email: email, password: 'password123', email_confirm: true
    });
    userId = newUser.user!.id;

    const { data: newMember, error: memberError } = await supabase.from('member').insert({
        koperasi_id: koperasiId, 
        user_id: userId, 
        nomor_anggota: `M-${Date.now()}`, 
        nama_lengkap: 'Test Repay Member',
        nik: `3201${Date.now()}`,
        phone: '081234567890',
        alamat_lengkap: 'Jl. Test No. 123',
        status: 'active',
        tanggal_daftar: new Date().toISOString()
    }).select().single();
    
    if (memberError) {
        console.error('Member creation failed:', memberError);
        process.exit(1);
    }
    memberId = newMember.id;

    // 3. Product (Financing)
    let productId: string;
    const { data: products } = await supabase.from('loan_products').select('*').eq('koperasi_id', koperasiId).limit(10);
    const existingProduct = products?.find((p: any) => p.is_financing === true || p.name.toLowerCase().includes('syariah'));

    if (existingProduct) {
        productId = existingProduct.id;
    } else {
        // Create Product
        const { data: newProduct, error: prodError } = await supabase.from('loan_products').insert({
            koperasi_id: koperasiId, 
            code: `PROD-${Date.now()}`,
            name: 'Pembiayaan Elektronik', 
            interest_rate: 10, 
            interest_type: 'flat',
            max_amount: 10000000, 
            max_tenor_months: 12,
            is_active: true,
        }).select().single();
        
        if (prodError) {
             console.error('Product creation failed:', prodError);
             process.exit(1);
        }
        productId = newProduct.id;
        
        // Try to update is_financing
        try {
            await supabase.from('loan_products').update({ is_financing: true, financing_category: 'murabahah' }).eq('id', productId);
        } catch (e) { console.warn('Migration missing for is_financing. Creating basic product.'); }
    }

    // 4. Disburse Financing (Reuse FinancingService logic)
    const financingService = new FinancingService(supabase);
    
    // Application
    const { data: app, error: appError } = await supabase.from('loan_applications').insert({
        koperasi_id: koperasiId, 
        member_id: memberId, 
        product_id: productId, 
        amount: 1200000, 
        tenor_months: 12, 
        purpose: 'Test Repayment',
        status: 'approved', 
        created_by: userId,
        workflow_metadata: { notes: 'Auto Approved for Test' }
    }).select().single();

    if (appError) {
        console.error('Application creation failed:', appError);
        process.exit(1);
    }

    // Disburse
    console.log('Disbursing...');
    const loan = await financingService.disburseFinancing(app.id, userId);
    console.log(`Loan Disbursed: ${loan.loan_code}`);

    // 5. Repayment
    const loanService = new LoanService(supabase);
    
    // Get Schedule
    const { data: schedules } = await supabase.from('loan_repayment_schedule').select('*').eq('loan_id', loan.id).order('installment_number').limit(1);
    const firstInstallment = schedules![0];
    
    console.log(`First Installment Due: ${firstInstallment.total_installment} (Principal: ${firstInstallment.principal_portion}, Margin: ${firstInstallment.interest_portion})`);

    // Pay it
    console.log('Processing Repayment...');
    await loanService.recordRepayment(firstInstallment.id, firstInstallment.total_installment, userId, AccountCode.CASH_ON_HAND);
    
    // 6. Verify
    // A. Schedule Status
    const { data: updatedSchedule } = await supabase.from('loan_repayment_schedule').select('*').eq('id', firstInstallment.id).single();
    if (updatedSchedule.status !== 'paid') throw new Error('Schedule status not paid');
    console.log('✅ Schedule marked as Paid');

    // B. Journal
    const { data: journal } = await supabase.from('journals')
        .select('*, lines:journal_lines(*)')
        .eq('reference_id', firstInstallment.id)
        .eq('reference_type', 'FINANCING_REPAYMENT')
        .single();

    if (!journal) throw new Error('Journal not found');
    
    console.log('Journal Lines:', journal.lines.map((l: any) => ({ acc: l.account_id, dr: l.debit, cr: l.credit })));
    
    if (journal.lines.length !== 4) throw new Error(`Expected 4 journal lines (Murabahah), got ${journal.lines.length}`);
    
    // Verify totals
    const totalDr = journal.lines.reduce((s: number, l: any) => s + l.debit, 0);
    const totalCr = journal.lines.reduce((s: number, l: any) => s + l.credit, 0);
    if (Math.abs(totalDr - totalCr) > 0.01) throw new Error('Journal not balanced');
    
    console.log('✅ Financing Repayment Test Passed!');
}

main().catch(err => {
    console.error('❌ Test Failed:', err);
    process.exit(1);
});
