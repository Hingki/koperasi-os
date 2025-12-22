import { createClient } from '@/lib/supabase/server';
import { JournalTable } from './journal-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function JournalPage() {
  const supabase = await createClient();

  // Fetch recent entries
  const { data: entries } = await supabase
    .from('ledger_entry')
    .select(`
        *,
        debit_account:chart_of_accounts!account_debit(account_code, account_name),
        credit_account:chart_of_accounts!account_credit(account_code, account_name)
    `)
    .order('entry_date', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jurnal Umum</h1>
          <p className="text-muted-foreground">
            Histori transaksi keuangan dan jurnal penyesuaian.
          </p>
        </div>
        <Link href="/dashboard/accounting/journal/new">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Buat Jurnal Manual
          </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-white p-4">
         <JournalTable initialEntries={entries || []} />
      </div>
    </div>
  );
}
