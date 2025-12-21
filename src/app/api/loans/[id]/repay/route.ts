import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { LoanService } from '@/lib/services/loan-service';
import { loanRepaymentSchema } from '@/lib/validations/loan';
import { hasAnyRole } from '@/lib/auth/roles';
import { z } from 'zod';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const supabase = await createClient();

    // 1. Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    // 2. Validate ID & Parse Body
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.id)) {
        return NextResponse.json({ error: 'ValidationError', message: 'Invalid Loan ID format' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = loanRepaymentSchema.parse(body);

    // 3. Permission Check (Koperasi Context)
    const { data: loan, error: loanError } = await supabase
        .from('loans')
        .select('id, koperasi_id, loan_code')
        .eq('id', params.id)
        .single();

    if (loanError || !loan) {
        return NextResponse.json({ error: 'NotFound', message: 'Loan not found' }, { status: 404 });
    }

    // Only Admin/Teller can process repayments
    const isAuthorized = await hasAnyRole(['admin', 'pengurus', 'bendahara', 'staff'], loan.koperasi_id);
    if (!isAuthorized) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Insufficient permissions to process repayment' },
            { status: 403 }
        );
    }

    // 4. Find Oldest Pending Schedule
    const { data: schedule, error: scheduleError } = await supabase
        .from('loan_repayment_schedule')
        .select('id, installment_number, total_installment, paid_amount')
        .eq('loan_id', loan.id)
        .eq('status', 'pending')
        .order('installment_number', { ascending: true })
        .limit(1)
        .single();

    if (scheduleError || !schedule) {
         // Check if partially paid?
         // For now, if no pending schedule found, assume paid off or error
         return NextResponse.json({ error: 'BadRequest', message: 'No pending installments found for this loan' }, { status: 400 });
    }

    // 5. Invoke Service
    const loanService = new LoanService(supabase);
    // Use the schedule ID found
    const result = await loanService.recordRepayment(schedule.id, validatedData.amount, user.id);

    return NextResponse.json(
      { 
        message: `Repayment processed successfully for Installment #${schedule.installment_number}`, 
        data: result 
      }, 
      { status: 200 }
    );

  } catch (error: any) {
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'ValidationError', details: error.errors }, { status: 400 });
    }
    console.error('Repayment Error:', error);
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message || 'Failed to process repayment' },
      { status: 500 }
    );
  }
}
