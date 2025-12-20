import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { LoanService } from '@/lib/services/loan-service';
import { loanRepaymentSchema } from '@/lib/validations/loan';
import { hasAnyRole } from '@/lib/auth/roles';
import { z } from 'zod';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient();

    // 1. Auth Check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'You must be logged in' },
        { status: 401 }
      );
    }

    // 2. Parse Body
    const body = await request.json();
    const validatedData = loanRepaymentSchema.parse(body);

    // 3. Permission Check (Koperasi Context)
    const { data: loan, error: loanError } = await supabase
        .from('loans')
        .select('koperasi_id')
        .eq('id', params.id)
        .single();

    if (loanError || !loan) {
        return NextResponse.json({ error: 'NotFound', message: 'Loan not found' }, { status: 404 });
    }

    // Only Admin/Teller can process repayments
    const isAuthorized = await hasAnyRole(supabase, user.id, loan.koperasi_id, ['admin', 'pengurus', 'bendahara', 'teller']);
    if (!isAuthorized) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Insufficient permissions to process repayment' },
            { status: 403 }
        );
    }

    // 4. Invoke Service
    const loanService = new LoanService(supabase);
    const result = await loanService.processRepayment(params.id, validatedData.amount, user.id);

    return NextResponse.json(
      { 
        message: 'Repayment processed successfully', 
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
