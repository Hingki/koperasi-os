'use server';

import { createClient } from '@/lib/supabase/server';
import { AccountCode } from '@/lib/types/ledger';

export async function getDailyClosingData(koperasiId: string, date?: string) {
  const supabase = await createClient();
  const targetDate = date ? new Date(date) : new Date();
  
  // Start and End of day
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // 1. Fetch Marketplace Transactions (The Orchestrator Truth)
  const { data: marketplaceTrx, error: mpError } = await supabase
    .from('marketplace_transactions')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString());

  if (mpError) throw new Error(`Failed to fetch marketplace transactions: ${mpError.message}`);

  // Summary by Status
  const summary = {
    total_initiated: 0,
    total_journal_locked: 0,
    total_fulfilled: 0,
    total_settled: 0,
    total_reversed: 0,
    count_initiated: 0,
    count_journal_locked: 0,
    count_fulfilled: 0,
    count_settled: 0,
    count_reversed: 0,
  };

  marketplaceTrx.forEach((trx: any) => {
    const amount = trx.amount;
    if (trx.status === 'initiated') { summary.total_initiated += amount; summary.count_initiated++; }
    if (trx.status === 'journal_locked') { summary.total_journal_locked += amount; summary.count_journal_locked++; }
    if (trx.status === 'fulfilled') { summary.total_fulfilled += amount; summary.count_fulfilled++; }
    if (trx.status === 'settled') { summary.total_settled += amount; summary.count_settled++; }
    if (trx.status === 'reversed') { summary.total_reversed += amount; summary.count_reversed++; }
  });

  // 2. Fetch POS Transactions (Operational Truth)
  const { data: posTrx, error: posError } = await supabase
    .from('pos_transactions')
    .select('final_amount, payment_method')
    .eq('koperasi_id', koperasiId)
    .gte('created_at', startOfDay.toISOString())
    .lte('created_at', endOfDay.toISOString())
    .neq('status', 'cancelled'); // Exclude cancelled

  if (posError) throw new Error(`Failed to fetch POS transactions: ${posError.message}`);

  const operationalSummary = {
    total_sales: 0,
    by_method: {} as Record<string, number>
  };

  posTrx.forEach((trx: any) => {
    operationalSummary.total_sales += trx.final_amount;
    // Note: payment_method might be JSON or string depending on schema.
    // Assuming string or simple structure. If it's PaymentBreakdown[], we need to parse.
    // Checking retail-service, it seems payment_method in pos_transactions is usually string (primary) or we look at payments table.
    // Let's assume simple grouping for now or skip breakdown if complex.
    // Actually, 'pos_transactions' has 'payment_method' column which is usually the main method.
    const method = trx.payment_method || 'unknown';
    operationalSummary.by_method[method] = (operationalSummary.by_method[method] || 0) + trx.final_amount;
  });

  // 3. Fetch Ledger (Accounting Truth)
  // We want to see total Debits to Cash/Bank and Credits to Revenue/Sales
  // Ideally, we filter by journal entries created today.
  const { data: journals, error: journalError } = await supabase
    .from('journal_entries')
    .select(`
        id,
        transaction_date,
        journal_lines (
            account_id,
            debit,
            credit,
            accounts (
                code,
                name
            )
        )
    `)
    .eq('koperasi_id', koperasiId)
    .gte('transaction_date', startOfDay.toISOString())
    .lte('transaction_date', endOfDay.toISOString());

  if (journalError) throw new Error(`Failed to fetch journals: ${journalError.message}`);

  const ledgerSummary = {
    total_debit_cash: 0,
    total_credit_revenue: 0,
    total_debit_cogs: 0,
    total_credit_inventory: 0
  };

  journals.forEach((journal: any) => {
    journal.journal_lines.forEach((line: any) => {
        const code = line.accounts.code;
        if (code === AccountCode.CASH_ON_HAND || code.startsWith('1-10')) { // Cash
            ledgerSummary.total_debit_cash += line.debit;
        }
        if (code === AccountCode.SALES_REVENUE || code.startsWith('4-')) { // Revenue
            ledgerSummary.total_credit_revenue += line.credit;
        }
    });
  });

  return {
    date: targetDate,
    marketplace: summary,
    operational: operationalSummary,
    ledger: ledgerSummary,
    discrepancy: {
        market_vs_operational: summary.total_settled - operationalSummary.total_sales, // Should be 0 (if all retail)
        market_vs_ledger: summary.total_settled - ledgerSummary.total_credit_revenue // Should be close to 0 (excluding tax)
    }
  };
}
