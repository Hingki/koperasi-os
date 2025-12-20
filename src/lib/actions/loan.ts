'use server';

import { createClient } from '@/lib/supabase/server';
import { LoanWorkflowService } from '@/lib/services/loan-workflow';
import { LoanService } from '@/lib/services/loan-service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Action to create a new application (by admin)
export async function createLoanApplication(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const memberId = formData.get('member_id') as string;
  const productId = formData.get('product_id') as string;
  const amount = Number(formData.get('amount'));
  const tenorMonths = Number(formData.get('tenor_months'));
  const purpose = formData.get('purpose') as string;

  // Get Koperasi ID
  const { data: member } = await supabase.from('member').select('koperasi_id').eq('id', memberId).single();
  if (!member) throw new Error("Member not found");

  const { error } = await supabase.from('loan_applications').insert({
    koperasi_id: member.koperasi_id,
    member_id: memberId,
    product_id: productId,
    amount,
    tenor_months: tenorMonths,
    purpose,
    status: 'submitted', // Auto-submit for admin creation
    workflow_metadata: {
        submitted_by: user.id,
        submitted_at: new Date().toISOString()
    },
    created_by: user.id
  });

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/loans/approvals');
  redirect('/dashboard/loans/approvals');
}

// Action to Review (Approve/Reject)
export async function reviewApplication(formData: FormData) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const applicationId = formData.get('application_id') as string;
  const action = formData.get('action') as 'approve' | 'reject';
  const notes = formData.get('notes') as string;

  const workflowService = new LoanWorkflowService(supabase);

  try {
    await workflowService.processAction({
        applicationId,
        actorId: user.id,
        action,
        notes
    });
  } catch (e: any) {
    console.error("Workflow Error:", e);
    throw new Error(e.message);
  }

  revalidatePath(`/dashboard/loans/approvals/${applicationId}`);
  revalidatePath('/dashboard/loans/approvals');
}

// Action to Disburse
export async function disburseApplication(applicationId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const loanService = new LoanService(supabase);
    
    try {
        await loanService.disburseLoan(applicationId, user.id);
    } catch (e: any) {
        console.error("Disbursement Error:", e);
        throw new Error(e.message);
    }

    revalidatePath(`/dashboard/loans/approvals/${applicationId}`);
    revalidatePath('/dashboard/loans/approvals');
}
