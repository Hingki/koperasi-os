'use server';

import { createClient } from '@/lib/supabase/server';
import { MarketplaceTransaction } from '@/lib/services/marketplace-service';

export interface ClosingSummary {
  total_transactions: number;
  total_amount: number;
  cash_amount: number;
  qris_amount: number;
  savings_amount: number;
  start_time: string;
  end_time: string;
  operator_name: string;
}

export async function getClosingSummary(): Promise<ClosingSummary> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOfDay = today.toISOString();

  const { data: posTransactions, error: posError } = await supabase
    .from('pos_transactions')
    .select('id, payment_method, final_amount')
    .eq('created_by', user.id)
    .gte('transaction_date', startOfDay)
    .eq('payment_status', 'paid');

  if (posError) throw new Error(posError.message);

  let cash = 0;
  let qris = 0;
  let savings = 0;

  posTransactions?.forEach(trx => {
    if (trx.payment_method === 'cash') cash += trx.final_amount;
    else if (trx.payment_method === 'qris') qris += trx.final_amount;
    else if (trx.payment_method === 'savings_balance') savings += trx.final_amount;
  });

  return {
    total_transactions: posTransactions?.length || 0,
    total_amount: (cash + qris + savings),
    cash_amount: cash,
    qris_amount: qris,
    savings_amount: savings,
    start_time: startOfDay,
    end_time: new Date().toISOString(),
    operator_name: user.email || 'Unknown'
  };
}

export async function submitClosing(data: {
  summary: ClosingSummary;
  actual_cash: number;
  notes?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Log closing (In real implementation, save to DB)
  console.log('Closing submitted:', data);

  return { success: true };
}
