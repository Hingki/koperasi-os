import { createClient } from '@/lib/supabase/server';
import { MultiPeriodView } from './multi-period-view';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PrintButton } from '@/components/common/print-button';

export const dynamic = 'force-dynamic';

export default async function MultiPeriodPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  // Fetch Koperasi ID
  const { data: member } = await supabase.from('member').select('koperasi_id').eq('user_id', user.id).single();
  let koperasiId = member?.koperasi_id;
  if (!koperasiId) {
      const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
      koperasiId = kop?.id;
  }

  // 1. Fetch Chart of Accounts
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .order('account_code');

  // 2. Fetch All Ledger Entries
  // We fetch ALL posted entries to allow client-side filtering by any period
  const { data: entries } = await supabase
    .from('ledger_entry')
    .select('id, account_debit, account_credit, amount, entry_date')
    .eq('koperasi_id', koperasiId)
    .eq('status', 'posted')
    .order('entry_date', { ascending: true });

  return (
    <div className="space-y-6 w-full mx-auto px-4">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/accounting/reports">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Laporan Multi-Periode</h1>
                <p className="text-muted-foreground">
                    Perbandingan kinerja keuangan antar bulan.
                </p>
            </div>
        </div>
        <PrintButton />
      </div>

      <MultiPeriodView accounts={accounts || []} entries={entries || []} />
    </div>
  );
}
