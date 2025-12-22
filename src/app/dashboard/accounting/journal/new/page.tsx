import { createClient } from '@/lib/supabase/server';
import { JournalForm } from '../journal-form';

export const dynamic = 'force-dynamic';

export default async function NewJournalPage() {
  const supabase = await createClient();
  
  // Fetch Accounts for dropdown
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('id, account_code, account_name')
    .order('account_code');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buat Jurnal Manual</h1>
        <p className="text-muted-foreground">
          Catat transaksi penyesuaian atau transaksi umum lainnya.
        </p>
      </div>

      <div className="rounded-md border bg-white p-6">
        <JournalForm accounts={accounts || []} />
      </div>
    </div>
  );
}
