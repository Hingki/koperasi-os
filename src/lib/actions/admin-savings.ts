
'use server';

import { createClient } from '@/lib/supabase/server';
import { SavingsService } from '@/lib/services/savings-service';
import { revalidatePath } from 'next/cache';

export async function approveWithdrawalRequest(requestId: string, adminNote: string = '') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  // 1. Get Request
  const { data: request, error: reqError } = await supabase
    .from('savings_withdrawal_requests')
    .select(`
      *,
      account:savings_accounts(*, product:savings_products(*))
    `)
    .eq('id', requestId)
    .single();

  if (reqError || !request) {
    return { error: 'Permohonan tidak ditemukan.' };
  }

  if (request.status !== 'pending') {
    return { error: 'Permohonan sudah diproses sebelumnya.' };
  }

  // 2. Process Withdrawal using SavingsService
  // This handles Balance Check, Ledger, and Transaction Record
  const service = new SavingsService(supabase);
  
  try {
    // Note: processTransaction handles balance check again, which is good for safety.
    await service.processTransaction(
      request.account_id,
      request.amount,
      'withdrawal',
      user.id,
      `Penarikan Online #${request.id.slice(0,8)} - ${request.bank_name} ${request.account_number} a.n ${request.account_holder}`
    );
  } catch (err: any) {
    console.error('Savings Service Error:', err);
    return { error: err.message || 'Gagal memproses transaksi simpanan.' };
  }

  // 3. Update Request Status
  const { error: updateError } = await supabase
    .from('savings_withdrawal_requests')
    .update({
      status: 'approved',
      admin_note: adminNote,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('Update Request Error:', updateError);
    // Transaction succeeded but status update failed. 
    // Ideally we should rollback, but with Supabase client we can't easily.
    // Critical log.
    return { error: 'Transaksi berhasil tetapi gagal update status permohonan.' };
  }

  revalidatePath('/dashboard/savings/requests');
  return { success: true };
}

export async function rejectWithdrawalRequest(requestId: string, adminNote: string = '') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('savings_withdrawal_requests')
    .update({
      status: 'rejected',
      admin_note: adminNote,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)
    .eq('status', 'pending'); // Ensure concurrency safety

  if (error) {
    console.error('Reject Error:', error);
    return { error: 'Gagal menolak permohonan.' };
  }

  revalidatePath('/dashboard/savings/requests');
  return { success: true };
}
