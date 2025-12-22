import { createClient } from '@/lib/supabase/server';
import { calculateAccountBalances, classifyEquityChanges } from '@/lib/utils/accounting';
import { EquityChangesView } from './equity-changes-view';

export const dynamic = 'force-dynamic';

export default async function EquityChangesPage() {
  const supabase = await createClient();

  // 1. Fetch Koperasi ID
  const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
  const koperasiId = kop?.id;

  if (!koperasiId) {
    return <div>Koperasi not found</div>;
  }

  // 2. Fetch Accounts
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .order('account_code');

  // 3. Fetch Entries
  const { data: entries } = await supabase
    .from('ledger_entry')
    .select('account_debit, account_credit, amount')
    .eq('koperasi_id', koperasiId);

  // 4. Calculate
  const balances = calculateAccountBalances(accounts || [], entries || []);
  const equityData = classifyEquityChanges(balances);

  return <EquityChangesView data={equityData} />;
}
