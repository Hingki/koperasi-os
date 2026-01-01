'use server';

import { createClient } from '@/lib/supabase/server';

export async function getTransactionAuditTrail(transactionId: string) {
  const supabase = await createClient();

  // 1. Get Marketplace Transaction (The Core)
  const { data: marketplaceTrx, error: mpError } = await supabase
    .from('marketplace_transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (mpError) throw new Error(`Transaction not found: ${mpError.message}`);

  // 2. Get Ledger Entries (The Money Trail)
  // Linked by reference_id (usually the invoice number or transaction ID)
  // Marketplace transaction might store reference_id in metadata or column
  // Looking at service, referenceId is passed to lockJournal.
  // MarketplaceTrx has 'reference_id' column (seen in getExportData).
  
  const referenceId = marketplaceTrx.reference_id || transactionId;

  const { data: journals, error: journalError } = await supabase
    .from('journal_entries')
    .select(`
        *,
        journal_lines (
            *,
            accounts (code, name)
        )
    `)
    .or(`reference_id.eq.${referenceId},reference_id.eq.${transactionId}`)
    .order('created_at', { ascending: true });

  // 3. Get Operational Record (The Context)
  let operationalRecord = null;
  if (marketplaceTrx.entity_type === 'retail' && marketplaceTrx.entity_id && marketplaceTrx.entity_id !== 'pending') {
      const { data: posTrx } = await supabase
          .from('pos_transactions')
          .select('*, pos_transaction_items(*)')
          .eq('id', marketplaceTrx.entity_id)
          .single();
      operationalRecord = posTrx;
  }

  // 4. Get System Logs / State Changes (if available)
  // Checking for system_logs or similar
  const { data: logs } = await supabase
    .from('system_logs')
    .select('*')
    .eq('entity_id', transactionId)
    .order('created_at', { ascending: true });

  return {
    marketplace: marketplaceTrx,
    journals: journals || [],
    operational: operationalRecord,
    logs: logs || []
  };
}
