import { createClient } from '@/lib/supabase/server';
import { IncomeStatementView } from './income-statement-view';
import { calculateAccountBalances, classifyIncomeStatement } from '@/lib/utils/accounting';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PrintButton } from '@/components/common/print-button';

export const dynamic = 'force-dynamic';

export default async function IncomeStatementPage() {
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

  // 2. Fetch All Ledger Entries (For MVP)
  const { data: entries } = await supabase
    .from('ledger_entry')
    .select('account_debit, account_credit, amount')
    .eq('koperasi_id', koperasiId)
    .eq('status', 'posted');

  // 3. Calculate Balances
  const balances = calculateAccountBalances(accounts || [], entries || []);

  // 4. Classify for Income Statement
  const reportData = classifyIncomeStatement(balances);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/accounting/reports">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Laporan Laba Rugi (Income Statement)</h1>
                <p className="text-muted-foreground">
                    Periode Berjalan per {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
            </div>
        </div>
        <PrintButton />
      </div>

      <IncomeStatementView data={reportData} />
    </div>
  );
}
