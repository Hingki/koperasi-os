'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function openNewPeriodAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Get Koperasi ID
  const { data: role } = await supabase
    .from('user_role')
    .select('koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!role) throw new Error('No koperasi access');

  // Find latest period to determine next one
  const { data: latestPeriod } = await supabase
    .from('accounting_period')
    .select('*')
    .eq('koperasi_id', role.koperasi_id)
    .order('end_date', { ascending: false })
    .limit(1)
    .single();

  let nextStartDate: Date;
  let nextEndDate: Date;
  let periodName: string;
  let year: number;
  let month: number;

  if (!latestPeriod) {
    // Start from current month if no history
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1; // 1-12
    nextStartDate = new Date(year, month - 1, 1);
    nextEndDate = new Date(year, month, 0); // Last day of month
    periodName = `${new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(nextStartDate)} ${year}`;
  } else {
    // Next month after latest
    const lastEnd = new Date(latestPeriod.end_date);
    nextStartDate = new Date(lastEnd);
    nextStartDate.setDate(lastEnd.getDate() + 1);

    year = nextStartDate.getFullYear();
    month = nextStartDate.getMonth() + 1;

    // Determine end of this next month
    nextEndDate = new Date(year, month, 0);
    periodName = `${new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(nextStartDate)} ${year}`;
  }

  // Create Period
  const { error } = await supabase
    .from('accounting_period')
    .insert({
      koperasi_id: role.koperasi_id,
      period_name: periodName,
      period_type: 'monthly',
      year: year,
      month: month,
      start_date: nextStartDate.toISOString().split('T')[0],
      end_date: nextEndDate.toISOString().split('T')[0],
      status: 'open',
      created_by: user.id
    });

  if (error) throw new Error(error.message);

  revalidatePath('/dashboard/accounting/periods');
  return { success: true };
}

import { AccountingPeriodService } from '@/lib/services/accounting-period-service';
import { LogService } from '@/lib/services/log-service';

export async function closePeriodAction(periodId: string, reason: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const logService = new LogService(supabase);
  const startTime = Date.now();

  if (!user) throw new Error('Unauthorized');

  // Get Koperasi ID
  const { data: role } = await supabase
    .from('user_role')
    .select('koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!role) throw new Error('No koperasi access');

  const service = new AccountingPeriodService(supabase);

  try {
    await service.closePeriod(role.koperasi_id, periodId, user.id, reason);

    await logService.log({
      action_type: 'TUTUP_BUKU',
      action_detail: 'CLOSE_PERIOD',
      entity_id: periodId,
      status: 'SUCCESS',
      user_id: user.id,
      metadata: { reason, duration_ms: Date.now() - startTime }
    });

    revalidatePath('/dashboard/accounting/periods');
    return { success: true };
  } catch (error: any) {
    await logService.log({
      action_type: 'TUTUP_BUKU',
      action_detail: 'CLOSE_PERIOD',
      entity_id: periodId,
      status: 'FAILURE',
      user_id: user.id,
      metadata: { reason, error: error.message, duration_ms: Date.now() - startTime }
    });
    throw new Error(error.message || 'Failed to close period');
  }
}
