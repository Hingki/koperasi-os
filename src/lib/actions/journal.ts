'use server';

import { createClient } from '@/lib/supabase/server';
import { AccountingService, CreateJournalDTO } from '@/lib/services/accounting-service';
import { revalidatePath } from 'next/cache';

export async function getJournalsAction(params: {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  businessUnit?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  // Get Koperasi ID
  const { data: role } = await supabase
    .from('user_role')
    .select('koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!role) {
    throw new Error('No koperasi access found');
  }

  return await AccountingService.getJournals(role.koperasi_id, params, supabase);
}

export async function createManualJournalAction(
  data: Omit<CreateJournalDTO, 'koperasi_id' | 'created_by'>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Role Check
  const { data: role } = await supabase
    .from('user_role')
    .select('koperasi_id, role')
    .eq('user_id', user.id)
    .single();

  if (!role || !['admin', 'bendahara'].includes(role.role)) {
    return { error: 'Access Denied: Only Admin/Bendahara can create manual journals' };
  }

  try {
    await AccountingService.postJournal({
      ...data,
      koperasi_id: role.koperasi_id,
    }, supabase);
    
    revalidatePath('/dashboard/accounting/journals');
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to create journal' };
  }
}
