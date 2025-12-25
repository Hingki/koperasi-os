import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { LoanService } from '../../src/lib/services/loan-service';

// Load .env explicitly for Playwright
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Must use service role to bypass some RLS for setup
const supabase = createClient(supabaseUrl, supabaseKey);

test.describe('Loan Module Full Flow', () => {
  let koperasiId: string;
  let memberId: string;
  let userId: string;
  let productId: string;
  let loanId: string;

  test.beforeAll(async () => {
    // 1. Setup Data
    // Get Koperasi
    const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    koperasiId = koperasi!.id;

    // Get a Member (or create one)
    // For simplicity, let's pick an existing active member or create a dummy one
    const { data: member } = await supabase
        .from('member')
        .select('id, user_id')
        .eq('koperasi_id', koperasiId)
        .eq('status', 'active')
        .limit(1)
        .single();
    
    if (member) {
        memberId = member.id;
        userId = member.user_id!; // Assuming linked
    } else {
        // Create a test user/member if none exists
        const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
            email: `test_loan_${Date.now()}@example.com`,
            password: 'password123',
            email_confirm: true
        });
        
        if (userError || !newUser.user) throw new Error("Failed to create test user");
        userId = newUser.user.id;

        const { data: newMember, error: memberError } = await supabase.from('member').insert({
            koperasi_id: koperasiId,
            user_id: userId,
            nama_lengkap: 'Test Loan User',
            nomor_anggota: `M-${Date.now()}`,
            nik: `1234567890${Date.now().toString().slice(-6)}`,
            phone: '08123456789',
            alamat_lengkap: 'Test Address',
            status: 'active',
            tanggal_daftar: new Date().toISOString()
        }).select().single();

        if (memberError) throw new Error(`Failed to create member: ${memberError.message}`);
        memberId = newMember.id;
    }

    // Create a Loan Product
    const { data: product } = await supabase
        .from('loan_products')
        .insert({
            koperasi_id: koperasiId,
            code: `TEST-PROD-${Date.now()}`,
            name: 'Test Loan Product',
            interest_rate: 10,
            interest_type: 'flat',
            max_tenor_months: 12,
            min_amount: 1000000,
            max_amount: 10000000,
            is_active: true
        })
        .select()
        .single();
    productId = product!.id;
  });

  test('Full Loan Cycle: Apply -> Approve -> Disburse -> Verify Ledger', async ({ request }) => {
    // 1. Apply for Loan (API)
    // We mock the user context by passing headers if using actual Auth, 
    // but here we might need to rely on the service role or simulate auth.
    // Since we are using Service Role client in this test file, we can invoke Supabase directly 
    // to simulate the "API" actions if strictly testing Logic, OR use `request` fixture for actual API calls.
    // Let's use direct Supabase calls for "whitebox" testing of the flow logic, 
    // matching what the API would do.

    // A. Create Application (Draft)
    const { data: app, error: appError } = await supabase
        .from('loan_applications')
        .insert({
            koperasi_id: koperasiId,
            member_id: memberId,
            product_id: productId,
            amount: 5000000,
            tenor_months: 6,
            purpose: 'Test Loan',
            status: 'draft',
            created_by: userId
        })
        .select()
        .single();
    expect(appError).toBeNull();
    expect(app).toBeDefined();
    expect(app!.status).toBe('draft');
    const appId = app!.id;

    // B. Submit Application
    const { error: submitError } = await supabase
        .from('loan_applications')
        .update({
            status: 'submitted',
            workflow_metadata: { submitted_by: userId, submitted_at: new Date().toISOString() }
        })
        .eq('id', appId);
    expect(submitError).toBeNull();

    // C. Approve Application (Admin Action)
    const { error: approveError } = await supabase
        .from('loan_applications')
        .update({
            status: 'approved',
            workflow_metadata: { 
                submitted_by: userId, 
                submitted_at: new Date().toISOString(),
                approved_by: userId, // Self-approval for test simplicity
                approved_at: new Date().toISOString()
            }
        })
        .eq('id', appId);
    expect(approveError).toBeNull();

    // D. Disburse Loan (Call the Service Logic via API or direct logic)
    // Since we implemented a Route Handler, let's try to hit the API if possible, 
    // but without a valid session cookie for the test runner, it will fail 401.
    // So we will instantiate the Service class directly here to test the LOGIC.
    
    const loanService = new LoanService(supabase); // Uses service role client

    const result = await loanService.disburseLoan(appId, userId);
    expect(result).toBe(true);

    // Fetch the created loan to verify
    const { data: loan, error: loanError } = await supabase
        .from('loans')
        .select('*')
        .eq('application_id', appId)
        .single();
    
    expect(loanError).toBeNull();
    expect(loan).toBeDefined();
    expect(loan!.status).toBe('active');
    expect(loan!.principal_amount).toBe(5000000);
    loanId = loan!.id;

    // E. Verify Repayment Schedule
    const { data: schedule, error: scheduleError } = await supabase
        .from('loan_repayment_schedule')
        .select('*')
        .eq('loan_id', loanId);
    
    expect(scheduleError).toBeNull();
    expect(schedule!.length).toBe(6); // 6 months tenor
    
    // Check totals
    const totalInstallment = schedule!.reduce((sum, item) => sum + item.total_installment, 0);
    // Principal + Interest (5M * 10% * 6/12 = 250k) -> 5.25M
    const expectedTotal = 5000000 + (5000000 * 0.10 * 0.5); 
    expect(Math.abs(totalInstallment - expectedTotal)).toBeLessThan(1); // Float tolerance

    // F. Verify Ledger Entry
    // Note: LoanService uses loan.id as tx_reference
    console.log(`[DEBUG] Checking ledger for tx_reference: ${loan!.id}`);
    
    const { data: ledgerEntries, error: ledgerError } = await supabase
        .from('ledger_entry')
        .select('*')
        .eq('tx_reference', loan!.id);
    
    if (ledgerError) console.error('[DEBUG] Ledger query error:', ledgerError);
    console.log(`[DEBUG] Found ${ledgerEntries?.length ?? 0} ledger entries`);
    if (ledgerEntries?.length === 0) {
        // Fallback debug: Check if any entries exist for this koperasi
        const { count } = await supabase.from('ledger_entry').select('*', { count: 'exact', head: true }).eq('koperasi_id', koperasiId);
        console.log(`[DEBUG] Total ledger entries for koperasi ${koperasiId}: ${count}`);
    }

    expect(ledgerError).toBeNull();
    // LedgerService creates ONE transaction record which might contain details or link to journal_entries
    // Depending on implementation, 'ledger_entry' might be the main transaction table or line items.
    // If it's the transaction table, length is 1.
    expect(ledgerEntries!.length).toBeGreaterThan(0); 
    const entry = ledgerEntries![0];
    
    // Check if entry has correct amount. Account codes might be in related tables if this is a header.
    expect(entry.amount).toBe(5000000);
  });
});
