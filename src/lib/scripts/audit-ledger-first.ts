
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditLedgerFirst() {
  console.log('Starting Ledger-First Integrity Audit...');
  console.log('========================================');

  const { count: ledgerCount, error: ledgerError } = await supabase
    .from('accounting_journal_entries')
    .select('*', { count: 'exact', head: true });

  if (ledgerError) {
    console.error('Failed to access Ledger:', ledgerError.message);
    return;
  }
  console.log(`Total Journal Entries: ${ledgerCount}`);

  // 1. Audit Savings Transactions
  console.log('\n[1] Auditing Savings Transactions...');
  const { data: savingsTrx, error: savingsError } = await supabase
    .from('savings_transactions')
    .select('id, transaction_date, amount, type')
    .order('transaction_date', { ascending: false });

  if (savingsError) {
    console.error('Failed to fetch savings transactions:', savingsError.message);
  } else {
    let orphans = 0;
    for (const trx of savingsTrx) {
      // Check if journal exists with reference_id = trx.id
      const { data: journal } = await supabase
        .from('accounting_journal_entries')
        .select('id')
        .eq('reference_id', trx.id)
        .eq('reference_type', 'savings_account') // or SAVINGS_DEPOSIT/WITHDRAWAL based on mapping
        .maybeSingle();

      // Also try 'SAVINGS_TRANSACTION' if type differs
      if (!journal) {
        const { data: journal2 } = await supabase
          .from('accounting_journal_entries')
          .select('id')
          .eq('reference_id', trx.id)
          .maybeSingle();

        if (!journal2) {
          console.warn(`[VIOLATION] Savings Trx ${trx.id} (${trx.type} - ${trx.amount}) has NO Ledger Entry!`);
          orphans++;
        }
      }
    }
    if (orphans === 0) console.log('✅ All Savings Transactions have Ledger Entries.');
    else console.error(`❌ Found ${orphans} Orphaned Savings Transactions!`);
  }

  // 2. Audit Retail Transactions (Paid)
  console.log('\n[2] Auditing Retail POS Transactions (Paid)...');
  const { data: posTrx, error: posError } = await supabase
    .from('pos_transactions')
    .select('id, invoice_number, final_amount')
    .eq('payment_status', 'paid')
    .not('invoice_number', 'ilike', 'INV-TEST%'); // Exclude test transactions

  if (posError) {
    console.error('Failed to fetch POS transactions:', posError.message);
  } else {
    let orphans = 0;
    for (const trx of posTrx) {
      const { data: journal } = await supabase
        .from('accounting_journal_entries')
        .select('id')
        .eq('reference_id', trx.invoice_number) // Retail uses Invoice Number often
        .maybeSingle();

      // Also try ID
      let found = !!journal;
      if (!found) {
        const { data: journal2 } = await supabase
          .from('accounting_journal_entries')
          .select('id')
          .eq('reference_id', trx.id)
          .maybeSingle();
        found = !!journal2;
      }

      if (!found) {
        console.warn(`[VIOLATION] POS Trx ${trx.invoice_number} (${trx.final_amount}) has NO Ledger Entry!`);
        orphans++;
      }
    }
    if (orphans === 0) console.log('✅ All Paid Retail Transactions have Ledger Entries.');
    else console.error(`❌ Found ${orphans} Orphaned Retail Transactions!`);
  }

  // 3. Loans (Disbursement)
  console.log('\n[3] Auditing Loan Disbursements...');
  const { data: loans, error: loanError } = await supabase
    .from('loans')
    .select('id, principal_amount, status')
    .eq('status', 'active');

  if (loanError) {
    console.error('Failed to fetch Loans:', loanError.message);
  } else {
    let orphans = 0;
    for (const loan of loans) {
      const { data: journal } = await supabase
        .from('accounting_journal_entries')
        .select('id')
        .eq('reference_id', loan.id)
        .eq('reference_type', 'LOAN_DISBURSEMENT')
        .maybeSingle();

      if (!journal) {
        console.warn(`[VIOLATION] Loan ${loan.id} (${loan.principal_amount}) has NO Ledger Entry!`);
        orphans++;
      }
    }
    if (orphans === 0) console.log('✅ All Active Loans have Ledger Entries.');
    else console.error(`❌ Found ${orphans} Orphaned Loan Disbursements!`);
  }

  // 4. Stock Opname (Final)
  console.log('\n[4] Auditing Stock Opname (Final)...');
  const { data: opnames, error: opnameError } = await supabase
    .from('inventory_stock_opname')
    .select('id, status')
    .eq('status', 'final');

  if (opnameError) {
    console.error('Failed to fetch Stock Opname:', opnameError.message);
  } else {
    let orphans = 0;
    for (const opname of opnames) {
      // Check if journal exists
      const { data: journal } = await supabase
        .from('accounting_journal_entries')
        .select('id')
        .eq('reference_id', opname.id)
        .eq('reference_type', 'STOCK_OPNAME_ADJUSTMENT')
        .maybeSingle();

      if (!journal) {
        // It's possible to have 0 variance, so this is just a warning/info
        console.warn(`[INFO] Stock Opname ${opname.id} has NO Ledger Entry (Possible Zero Variance).`);
        orphans++;
      }
    }
    if (orphans === 0) console.log('✅ All Final Stock Opnames have Ledger Entries.');
  }

  console.log('\n========================================');
  console.log('Audit Complete.');
}

auditLedgerFirst().catch(console.error);
