'use server';

import { LedgerIntentService } from '@/lib/services/ledger-intent-service';
import { createClient } from '@/lib/supabase/server';
import { PaymentBreakdown } from '@/lib/services/retail-service';
import { getUserRoles } from '@/lib/auth/roles';

// Helper to check access
async function checkSimulationAccess() {
  const roles = await getUserRoles();
  const allowedRoles = ['admin', 'bendahara', 'ketua', 'pengurus'];
  const hasAccess = roles.some(r => allowedRoles.includes(r.role));
  if (!hasAccess) {
    throw new Error('Unauthorized: Only Admin/Pengurus can access Audit Simulator');
  }
}

export async function simulateRetailLock(
  amount: number,
  paymentMethod: 'cash' | 'transfer' | 'savings_balance',
  savingsAccountId?: string
) {
  await checkSimulationAccess();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const koperasiId = user.user_metadata.koperasi_id;
  if (!koperasiId) throw new Error('Koperasi ID not found');

  const payments: PaymentBreakdown[] = [{
    method: paymentMethod as any,
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

export async function simulateRetailSettlement(
  amount: number,
  cogs: number,
  tax: number = 0
) {
  await checkSimulationAccess();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const koperasiId = user.user_metadata.koperasi_id;
  if (!koperasiId) throw new Error('Koperasi ID not found');

  // Assumption: All inventory is owned (no consignment for simulation simplicity)
  const inventoryCredit = cogs;
  const consignmentCredit = 0;

  const lines = await LedgerIntentService.prepareRetailSettlementLines(
    koperasiId,
    'SIM-INV-001-SETTLE',
    amount,
    tax,
    cogs,
    inventoryCredit,
    consignmentCredit
  );

  // Wrap in a structure similar to JournalDTO for UI consistency
  return {
    description: 'Retail Settlement (Revenue Recognition)',
    business_unit: 'retail',
    reference_id: 'SIM-INV-001-SETTLE',
    lines: lines
  };
}

export async function simulatePpobLock(
  amount: number,
  savingsAccountId: string
) {
  await checkSimulationAccess();
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
