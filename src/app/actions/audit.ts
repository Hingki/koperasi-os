'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserRoles } from '@/lib/auth/roles';

export async function getTransactionAuditTrail(searchTerm: string) {
  const supabase = await createClient();

  // RBAC Check: Audit Trail is sensitive
  const roles = await getUserRoles();
  const allowedRoles = ['admin', 'bendahara', 'ketua', 'pengurus', 'staff']; // Staff needs it for operational issues
  const hasAccess = roles.some(r => allowedRoles.includes(r.role));

  if (!hasAccess) {
    throw new Error('Unauthorized: Insufficient permissions to view audit trails.');
  }

  let marketplaceTrx = null;

  // 1. Strategy: Direct ID Match
  const { data: byId } = await supabase
    .from('marketplace_transactions')
    .select('*')
    .eq('id', searchTerm)
    .maybeSingle();

  if (byId) {
    marketplaceTrx = byId;
  } else {
    // 2. Strategy: Via Journal Reference (e.g. Invoice Number)
    // Find journal with this reference, then find marketplace transaction linked to it
    const { data: journal } = await supabase
      .from('journal_entries')
      .select('id')
      .eq('reference_id', searchTerm)
      .maybeSingle();

    if (journal) {
      const { data: byJournal } = await supabase
        .from('marketplace_transactions')
        .select('*')
        .eq('journal_id', journal.id)
        .maybeSingle();
      marketplaceTrx = byJournal;
    }

    // 3. Strategy: Via POS Invoice Number (if not found in journal or journal link missing)
    if (!marketplaceTrx) {
      const { data: posTrx } = await supabase
        .from('pos_transactions')
        .select('id')
        .eq('invoice_number', searchTerm)
        .maybeSingle();

      if (posTrx) {
        const { data: byEntity } = await supabase
          .from('marketplace_transactions')
          .select('*')
          .eq('entity_id', posTrx.id)
          .eq('entity_type', 'retail')
          .maybeSingle();
        marketplaceTrx = byEntity;
      }
    }

    // 4. Strategy: Via PPOB Customer Number (or Transaction ID)
    if (!marketplaceTrx) {
      // Try matching PPOB Transaction ID first (if UUID)
      let ppobTrx = null;
      const { data: byPPOBId } = await supabase.from('ppob_transactions').select('id').eq('id', searchTerm).maybeSingle();
      if (byPPOBId) {
        ppobTrx = byPPOBId;
      } else {
        // Try Customer Number
        const { data: byCustNum } = await supabase.from('ppob_transactions').select('id').eq('customer_number', searchTerm).order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (byCustNum) {
          ppobTrx = byCustNum;
        }
      }

      if (ppobTrx) {
        const { data: byEntity } = await supabase
          .from('marketplace_transactions')
          .select('*')
          .eq('entity_id', ppobTrx.id)
          .eq('entity_type', 'ppob')
          .maybeSingle();
        marketplaceTrx = byEntity;
      }
    }
  }

  if (!marketplaceTrx) throw new Error(`Transaction not found for: ${searchTerm}`);
  const transactionId = marketplaceTrx.id;

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
  } else if (marketplaceTrx.entity_type === 'ppob' && marketplaceTrx.entity_id && marketplaceTrx.entity_id !== 'pending') {
    const { data: ppobTrx } = await supabase
      .from('ppob_transactions')
      .select('*')
      .eq('id', marketplaceTrx.entity_id)
      .single();
    operationalRecord = ppobTrx;
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
