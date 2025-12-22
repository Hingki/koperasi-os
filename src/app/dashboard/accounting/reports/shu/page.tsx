import { createClient } from '@/lib/supabase/server';
import { SHUView } from './shu-view';
import { calculateAccountBalances, classifyIncomeStatement } from '@/lib/utils/accounting';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PrintButton } from '@/components/common/print-button';

export const dynamic = 'force-dynamic';

export default async function SHUPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  // Fetch Koperasi ID
  const { data: member } = await supabase.from('member').select('koperasi_id').eq('user_id', user.id).maybeSingle();
  let koperasiId = member?.koperasi_id;
  
  // Fallback for dev/admin if not linked to member
  if (!koperasiId) {
      const { data: kop } = await supabase.from('koperasi').select('id').limit(1).maybeSingle();
      koperasiId = kop?.id;
  }

  if (!koperasiId) {
      return <div>Koperasi data not found. Please set up a koperasi first.</div>;
  }

  // 1. Fetch Chart of Accounts
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .order('account_code');

  // 2. Fetch All Ledger Entries
  // Note: In production, filter by date range for the current fiscal year
  const { data: entries } = await supabase
    .from('ledger_entry')
    .select('account_debit, account_credit, amount')
    .eq('koperasi_id', koperasiId)
    .eq('status', 'posted');

  // 3. Calculate Balances
  const balances = calculateAccountBalances(accounts || [], entries || []);

  // 4. Calculate Net Profit
  const incomeStatement = classifyIncomeStatement(balances);
  const netProfit = incomeStatement.netProfit;

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
                <h1 className="text-2xl font-bold tracking-tight">Pembagian Sisa Hasil Usaha (SHU)</h1>
                <p className="text-muted-foreground">
                    Estimasi Distribusi SHU Tahun Berjalan
                </p>
            </div>
        </div>
        <PrintButton />
      </div>

      <SHUView netProfit={netProfit} />
    </div>
  );
}
