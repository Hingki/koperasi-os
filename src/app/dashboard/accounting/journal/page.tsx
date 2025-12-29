import { createClient } from '@/lib/supabase/server';
import { JournalTable } from './journal-table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function JournalPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];

  // Determine permissions & state
  const { data: userRes } = await supabase.auth.getUser();
  const userId = userRes.user?.id;
  let canCreate = false;
  let disabledReason: string | null = null;
  let kId: string | null = null;

  if (userId) {
    const { data: role } = await supabase
      .from('user_role')
      .select('koperasi_id, role')
      .eq('user_id', userId)
      .limit(1)
      .single();
    kId = role?.koperasi_id || null;

    if (kId) {
      const { count: accCount } = await supabase
        .from('accounts')
        .select('id', { head: true, count: 'exact' })
        .eq('koperasi_id', kId);
      const coaReady = (accCount || 0) > 0;

      const { data: period } = await supabase
        .from('accounting_periods')
        .select('is_closed')
        .eq('koperasi_id', kId)
        .lte('start_date', today)
        .gte('end_date', today)
        .limit(1)
        .single();
      const isClosed = !!period?.is_closed;

      const roleOk = ['admin','bendahara','staff','teller'].includes(role?.role || '');
      canCreate = roleOk && coaReady && !isClosed;
      if (!roleOk) disabledReason = 'Akses tidak mencukupi';
      else if (!coaReady) disabledReason = 'COA belum siap';
      else if (isClosed) disabledReason = 'Periode terkunci';
    }
  }

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
        {canCreate ? (
          <Link href="/dashboard/accounting/journal/new">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Buat Jurnal Manual
            </Button>
          </Link>
        ) : (
          <Button className="flex items-center gap-2" disabled title={disabledReason || undefined}>
            <Plus className="h-4 w-4" /> Buat Jurnal Manual
          </Button>
        )}
      </div>

      <div className="rounded-md border bg-white p-4">
         <JournalTable initialEntries={entries || []} />
      </div>
    </div>
  );
}
