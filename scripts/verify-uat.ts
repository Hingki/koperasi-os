import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log('--- UAT Verification ---');

  // 1. Check Approved Transactions
  const { data: txs } = await supabase
    .from('payment_transactions')
    .select('*, source:payment_sources(name)')
    .in('payment_status', ['success', 'approved'])
    .order('updated_at', { ascending: false })
    .limit(5);

  if (!txs || txs.length === 0) {
      console.log('No approved transactions found yet.');
      return;
  }

  console.log(`Found ${txs.length} approved transactions.`);

  for (const tx of txs) {
      console.log(`\nTransaction: ${tx.transaction_type} | Amount: ${tx.amount} | ID: ${tx.id}`);
      
      // 2. Check Ledger Entries
      const { data: entries } = await supabase
        .from('ledger_entries')
        .select('*, items:ledger_items(*)')
        .eq('reference_id', tx.id) // Assuming we link by reference_id or metadata
        .single();
        
      // Note: Ledger might link via 'transaction_id' or 'reference_id' depending on implementation.
      // payment-approval.ts uses: 
      // reference: `PAY-${tx.id}`
      // Or `transaction_id` in metadata?
      // Let's search by reference starts with
      
      const { data: journal } = await supabase
        .from('ledger_entries')
        .select('*, items:ledger_items(*)')
        .eq('reference', `PAY-${tx.id}`) // Assuming this format
        .maybeSingle();

      if (journal) {
          console.log(`✅ Journal Created: ${journal.description} (Date: ${journal.transaction_date})`);
          journal.items.forEach((item: any) => {
              console.log(`   - [${item.account_code}] ${item.account_name}: ${item.debit > 0 ? 'DR ' + item.debit : 'CR ' + item.credit}`);
          });
      } else {
          console.log('❌ No Journal found for this transaction.');
      }
  }
}

run().catch(console.error);
