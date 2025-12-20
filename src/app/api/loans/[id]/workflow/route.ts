import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { loanWorkflowSchema } from '@/lib/validations/loan';
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

    // 2. Parse & Validate Body
    const body = await request.json();
    const validatedData = loanWorkflowSchema.parse(body);
    const { action, notes } = validatedData;
    const loanId = params.id;

    // 3. Fetch Current Loan Status
    const { data: loan, error: loanError } = await supabase
      .from('loan_applications')
      .select('id, status, member_id, workflow_metadata, koperasi_id')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json(
        { error: 'NotFound', message: 'Loan application not found' },
        { status: 404 }
      );
    }

    // 4. State Machine Logic
    let newStatus = loan.status;
    let updateMetadata = { ...loan.workflow_metadata };

    if (action === 'submit') {
        // Rule: Only Owner can submit
        // Rule: Can only submit if status is 'draft'
        
        // Check ownership (We need to verify if the user owns this member profile)
        const { data: member } = await supabase
            .from('member')
            .select('user_id')
            .eq('id', loan.member_id)
            .single();
            
        if (!member || member.user_id !== user.id) {
             return NextResponse.json(
                { error: 'Forbidden', message: 'You do not own this application' },
                { status: 403 }
            );
        }

        if (loan.status !== 'draft') {
            return NextResponse.json(
                { error: 'BadRequest', message: `Cannot submit loan with status '${loan.status}'` },
                { status: 400 }
            );
        }

        newStatus = 'submitted';
        updateMetadata = {
            ...updateMetadata,
            submitted_at: new Date().toISOString(),
            submitted_by: user.id,
            notes: notes || ''
        };

    } else if (action === 'approve') {
        // Rule: Only Admin/Pengurus can approve
        // Rule: Can only approve if status is 'submitted' (or 'committee_review' in complex workflow)

        const isAuthorized = await hasAnyRole(supabase, user.id, loan.koperasi_id, ['admin', 'pengurus', 'ketua']);
        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Insufficient permissions to approve loans' },
                { status: 403 }
            );
        }

        if (loan.status !== 'submitted') {
             return NextResponse.json(
                { error: 'BadRequest', message: `Cannot approve loan with status '${loan.status}'` },
                { status: 400 }
            );
        }

        newStatus = 'approved';
        updateMetadata = {
            ...updateMetadata,
            approved_at: new Date().toISOString(),
            approved_by: user.id,
            approval_notes: notes || ''
        };

    } else if (action === 'reject') {
        // Rule: Only Admin/Pengurus can reject
        // Rule: Can reject from 'submitted'

        const isAuthorized = await hasAnyRole(supabase, user.id, loan.koperasi_id, ['admin', 'pengurus', 'ketua']);
        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Forbidden', message: 'Insufficient permissions to reject loans' },
                { status: 403 }
            );
        }

        if (loan.status !== 'submitted') {
             return NextResponse.json(
                { error: 'BadRequest', message: `Cannot reject loan with status '${loan.status}'` },
                { status: 400 }
            );
        }

        newStatus = 'rejected';
        updateMetadata = {
            ...updateMetadata,
            rejected_at: new Date().toISOString(),
            rejected_by: user.id,
            rejection_reason: notes
        };
    }

    // 5. Update Database
    const { data: updatedLoan, error: updateError } = await supabase
        .from('loan_applications')
        .update({
            status: newStatus,
            workflow_metadata: updateMetadata,
            updated_at: new Date().toISOString(),
            updated_by: user.id // Tracker who performed the action
        })
        .eq('id', loanId)
        .select()
        .single();

    if (updateError) {
        console.error('Workflow Update Error:', updateError);
         return NextResponse.json(
            { error: 'InternalServerError', message: 'Failed to update loan status' },
            { status: 500 }
        );
    }

    return NextResponse.json(
        { 
            message: `Loan application ${newStatus}`, 
            data: updatedLoan 
        }, 
        { status: 200 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'ValidationError', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Unexpected Error:', error);
    return NextResponse.json(
      { error: 'InternalServerError', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
