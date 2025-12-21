import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { LoanService } from '@/lib/services/loan-service';
import { hasAnyRole } from '@/lib/auth/roles';

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

    // 2. Permission Check
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(params.id)) {
        return NextResponse.json({ error: 'ValidationError', message: 'Invalid Loan ID format' }, { status: 400 });
    }

    // Get Koperasi ID first (fetch application lightweight)
    const { data: app, error: appError } = await supabase
        .from('loan_applications')
        .select('koperasi_id')
        .eq('id', params.id)
        .single();

    if (appError || !app) {
        return NextResponse.json({ error: 'NotFound', message: 'Loan application not found' }, { status: 404 });
    }

    const isAuthorized = await hasAnyRole(['admin', 'pengurus', 'bendahara'], app.koperasi_id);
    if (!isAuthorized) {
        return NextResponse.json(
            { error: 'Forbidden', message: 'Insufficient permissions to disburse loans' },
            { status: 403 }
        );
    }

    // 3. Invoke Service
    const loanService = new LoanService(supabase);
    const loan = await loanService.disburseLoan(params.id, user.id);

    return NextResponse.json(
      { 
        message: 'Loan disbursed successfully', 
        data: loan 
      }, 
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Disbursement Error:', error);
    return NextResponse.json(
      { error: 'InternalServerError', message: error.message || 'Failed to disburse loan' },
      { status: 500 }
    );
  }
}
