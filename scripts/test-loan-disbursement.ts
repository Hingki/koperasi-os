
import { createClient } from '@supabase/supabase-js';
import { LoanService } from '../src/lib/services/loan-service';
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
    console.log('--- Testing Cash Loan Disbursement ---');

    // 1. Setup Context
    const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    if (!koperasi) {
        console.error('No Koperasi found');
        process.exit(1);
    }
    const koperasiId = koperasi.id;

    // 2. Create/Get User & Member
    const email = `test.loan.${Date.now()}@example.com`;
    const { data: newUser } = await supabase.auth.admin.createUser({
        email: email,
        password: 'password123',
        email_confirm: true
    });
    const userId = newUser.user!.id;

    const { data: member } = await supabase.from('member').insert({
        koperasi_id: koperasiId,
        user_id: userId,
        nomor_anggota: `L-${Date.now()}`,
        nama_lengkap: 'Test Loan Member',
        nik: `3203${Date.now()}`,
        phone: '081211112222',
        alamat_lengkap: 'Jl. Loan Test',
        status: 'active'
    }).select().single();

    // 3. Create Loan Product (Cash)
    const productCode = `CSH-${Date.now()}`;
    let product;
    
    // Try with is_financing column
    const { data: p1, error: pError } = await supabase.from('loan_products').insert({
        koperasi_id: koperasiId,
        name: `Pinjaman Tunai ${productCode}`,
        code: productCode,
        interest_rate: 12, // 12% flat per year
        max_amount: 10000000,
        max_tenor_months: 12,
        is_active: true,
        is_financing: false, // Cash Loan
        description: 'Pinjaman Tunai'
    }).select().single();

    if (pError && pError.message.includes('is_financing')) {
        console.warn('Column is_financing missing. Creating basic product.');
        const { data: p2, error: pError2 } = await supabase.from('loan_products').insert({
            koperasi_id: koperasiId,
            name: `Pinjaman Tunai ${productCode}`,
            code: productCode,
            interest_rate: 12,
            max_amount: 10000000,
            max_tenor_months: 12,
            is_active: true,
            description: 'Pinjaman Tunai (Basic)'
        }).select().single();
        
        if (pError2) {
             console.error('Failed to create basic product:', pError2);
             process.exit(1);
        }
        product = p2;
    } else if (pError) {
        console.error('Failed to create product:', pError);
        process.exit(1);
    } else {
        product = p1;
    }

    // Ensure Accounts Exist
    const { error: accError } = await supabase.from('accounts').upsert([
        { koperasi_id: koperasiId, code: AccountCode.LOAN_RECEIVABLE_FLAT, name: 'Piutang Pinjaman', type: 'asset', normal_balance: 'DEBIT', is_active: true },
        { koperasi_id: koperasiId, code: AccountCode.CASH_ON_HAND, name: 'Kas Tunai', type: 'asset', normal_balance: 'DEBIT', is_active: true },
        { koperasi_id: koperasiId, code: AccountCode.INTEREST_INCOME_LOAN, name: 'Pendapatan Bunga Pinjaman', type: 'revenue', normal_balance: 'CREDIT', is_active: true }
    ], { onConflict: 'koperasi_id, code' });

    if (accError) console.error('Failed to ensure accounts:', accError);

    // 4. Submit Application
    console.log('Submitting Application...');
    const loanService = new LoanService(supabase);
    
    const amount = 5000000;
    const tenor = 10;

    const app = await loanService.applyForLoan({
        koperasi_id: koperasiId,
        member_id: member.id,
        loan_type_id: product.id,
        amount: amount,
        tenor_months: tenor,
        purpose: 'Modal Usaha',
        created_by: userId
    });

    // 5. Approve Application (Manual DB update)
    // We need to set workflow_metadata properly
    await supabase.from('loan_applications').update({
        status: 'approved',
        workflow_metadata: { approved_by: userId, approved_at: new Date().toISOString() }
    }).eq('id', app.id);

    // 6. Disburse
    console.log('Disbursing Loan...');
    try {
        await loanService.disburseLoan(app.id, userId);
        
        // Fetch Loan ID from application or query loans
        const { data: loan } = await supabase.from('loans').select('id, loan_code').eq('application_id', app.id).single();
        if (!loan) throw new Error('Loan not found after disbursement');
        console.log('Loan Disbursed. Loan ID:', loan.id);
        console.log('Loan Code:', loan.loan_code);

        // 7. Verify Journal
        const { data: journal } = await supabase.from('journals')
            .select('*, lines:journal_lines(*, account:accounts(code, name))')
            .eq('reference_id', loan.id)
            .eq('reference_type', 'LOAN_DISBURSEMENT')
            .single();

        if (!journal) throw new Error('Journal Entry NOT found');
        console.log('Journal Entry Found:', journal.description);
        
        // Expected amounts
        // Dr Receivable = 5,000,000
        // Cr Cash = 5,000,000
        
        const receivableLine = journal.lines.find((l: any) => l.account.code === AccountCode.LOAN_RECEIVABLE_FLAT);
        const cashLine = journal.lines.find((l: any) => l.account.code === AccountCode.CASH_ON_HAND);

        console.log('Journal Lines:', journal.lines.map((l: any) => `${l.account.code} (${l.debit}/${l.credit})`));

        if (!receivableLine || Number(receivableLine.debit) !== 5000000) throw new Error(`Receivable incorrect. Expected 5000000, got ${receivableLine?.debit}`);
        if (!cashLine || Number(cashLine.credit) !== 5000000) throw new Error(`Cash incorrect. Expected 5000000, got ${cashLine?.credit}`);

        console.log('✅ Loan Disbursement Test Passed!');

    } catch (err: any) {
        console.error('❌ Test Failed:', err.message);
        console.error(err);
    }
}

main().catch(console.error);
