import { SupabaseClient } from '@supabase/supabase-js';

export type LoanAction = 'submit' | 'approve' | 'reject';

export interface WorkflowActionParams {
  applicationId: string;
  actorId: string;
  action: LoanAction;
  notes?: string;
}

export class LoanWorkflowService {
  constructor(private supabase: SupabaseClient) {}

  async processAction({ applicationId, actorId, action, notes }: WorkflowActionParams) {
    // 1. Fetch current application
    const { data: app, error: fetchError } = await this.supabase
      .from('loan_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !app) throw new Error(`Application not found: ${fetchError?.message}`);

    // 2. Validate Transition
    this.validateTransition(app.status, action);

    // 3. Determine New Status
    let newStatus = app.status;
    let updateData: any = {
      updated_at: new Date().toISOString(),
      updated_by: actorId
    };

    if (action === 'approve') {
      newStatus = 'approved';
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = actorId;
    } else if (action === 'reject') {
      newStatus = 'rejected';
      updateData.rejected_at = new Date().toISOString();
      updateData.rejected_by = actorId;
    } else if (action === 'submit') {
      newStatus = 'submitted';
    }

    updateData.status = newStatus;
    
    // Append to workflow history (if JSONB array exists, otherwise simple notes field)
    // For now, assuming we just update the status fields. 
    // If there is a notes field, we might append or overwrite.
    if (notes) {
        updateData.admin_notes = notes; 
    }

    // 4. Update Database
    const { error: updateError } = await this.supabase
      .from('loan_applications')
      .update(updateData)
      .eq('id', applicationId);

    if (updateError) throw new Error(`Workflow Update Failed: ${updateError.message}`);

    return { success: true, newStatus };
  }

  private validateTransition(currentStatus: string, action: LoanAction) {
    const valid = {
      'draft': ['submit'],
      'submitted': ['approve', 'reject'],
      'approved': [], // Cannot change after approval (must go to disburse via LoanService)
      'rejected': [],
      'disbursed': [],
      'paid': []
    };

    // @ts-ignore
    const allowed = valid[currentStatus] || [];
    if (!allowed.includes(action)) {
      throw new Error(`Invalid action '${action}' for status '${currentStatus}'`);
    }
  }
}
