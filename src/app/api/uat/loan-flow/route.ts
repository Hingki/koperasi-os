import { createClient } from '@supabase/supabase-js';
import { LoanService } from '@/lib/services/loan-service';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  const loanService = new LoanService(supabase);

  try {
    // 1. Setup Data
    // Get first Koperasi
    const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    if (!koperasi) return NextResponse.json({ error: 'No Koperasi found' }, { status: 400 });

    // Get a Member (or create one)
    let { data: member } = await supabase.from('member').select('id, user_id').eq('koperasi_id', koperasi.id).limit(1).single();
    if (!member) {
       // Create dummy member if needed, but assuming one exists is safer for now
       return NextResponse.json({ error: 'No Member found' }, { status: 400 });
    }

    // Get an Admin User (for created_by fields)
    const adminId = member.user_id; // Just use member's user_id for simplicity or fetch a real admin

    // Create Test Product
    const productCode = `UAT-${Date.now()}`;
    const { data: product, error: prodError } = await supabase.from('loan_products').insert({
        koperasi_id: koperasi.id,
        code: productCode,
        name: 'Pinjaman Konsumtif UAT',
        description: 'Automated UAT Product',
        interest_rate: 12, // 12% pa
        interest_type: 'flat',
        max_tenor_months: 12,
        min_amount: 1000000,
        max_amount: 10000000,
        created_by: adminId,
        is_active: true
    }).select().single();

    if (prodError) throw prodError;

    // 2. Step 1: Apply
    const amount = 5000000;
    const tenor = 6;
    
    // Direct service call to bypass Action's cookie auth check
    const application = await loanService.applyForLoan({
        koperasi_id: koperasi.id,
        member_id: member.id,
        loan_type_id: product.id,
        amount: amount,
        tenor_months: tenor,
        purpose: 'UAT Automation Test',
        created_by: adminId
    });

    // 3. Step 2: Approve
    const approvedApp = await loanService.reviewApplication(application.id, 'approved', 'Auto Approved by UAT', adminId);

    // 4. Step 3: Disburse
    await loanService.disburseLoan(application.id, adminId);

    // 5. Verification
    // Check Loan
    const { data: loan } = await supabase.from('loans').select('*').eq('application_id', application.id).single();
    
    // Check Schedule
    const { data: schedule } = await supabase.from('loan_repayment_schedule').select('*').eq('loan_id', loan.id);

    // Cleanup (Optional: keep for inspection, or delete)
    // await supabase.from('loan_products').delete().eq('id', product.id);

    return NextResponse.json({
        success: true,
        flow: {
            product: product.name,
            application_id: application.id,
            status_after_approval: approvedApp.status,
            loan_id: loan.id,
            loan_status: loan.status,
            schedule_count: schedule?.length || 0,
            total_repayable: loan.total_amount_repayable
        }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
