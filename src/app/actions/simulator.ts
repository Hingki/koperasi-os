'use server';

import { LedgerIntentService } from '@/lib/services/ledger-intent-service';
import { createClient } from '@/lib/supabase/server';
import { PaymentBreakdown } from '@/lib/services/retail-service';

export async function simulateRetailLock(
  amount: number,
  paymentMethod: 'cash' | 'transfer' | 'savings_balance',
  savingsAccountId?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const koperasiId = user.user_metadata.koperasi_id;
  if (!koperasiId) throw new Error('Koperasi ID not found');

  const payments: PaymentBreakdown[] = [{
    method: paymentMethod,
    amount: amount,
    account_id: savingsAccountId
  }];

  const journalDTO = await LedgerIntentService.prepareMarketplaceLock(
    koperasiId,
    'retail',
    'SIM-INV-001',
    amount,
    payments,
    user.id
  );

  return journalDTO;
}

export async function simulatePpobLock(
  amount: number,
  savingsAccountId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const koperasiId = user.user_metadata.koperasi_id;
  if (!koperasiId) throw new Error('Koperasi ID not found');

  const payments: PaymentBreakdown[] = [{
    method: 'savings_balance',
    amount: amount,
    account_id: savingsAccountId
  }];

  const journalDTO = await LedgerIntentService.prepareMarketplaceLock(
    koperasiId,
    'ppob',
    'SIM-PPOB-001',
    amount,
    payments,
    user.id
  );

  return journalDTO;
}
