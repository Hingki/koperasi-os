import { createClient } from '@/lib/supabase/server';
import { LedgerView } from './ledger-view';

export const dynamic = 'force-dynamic';

export default async function LedgerPage() {
  const supabase = await createClient();

  // Fetch Accounts for dropdown
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .order('account_code');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buku Besar (Ledger)</h1>
        <p className="text-muted-foreground">
          Lihat detail transaksi per akun.
        </p>
      </div>

      <div className="rounded-md border bg-white p-6">
        <LedgerView accounts={accounts || []} />
      </div>
    </div>
  );
}
