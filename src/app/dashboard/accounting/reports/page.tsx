import { createClient } from '@/lib/supabase/server';
import { TrialBalanceTable } from './trial-balance-table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, TrendingUp, PieChart, Activity, Calculator, Banknote, Building2, Calendar, Receipt, Archive } from 'lucide-react';

export default async function ReportsPage() {
  console.log('[ReportsPage] Starting render...');
  const supabase = await createClient();

  // Fetch Accounts
  const { data: accounts, error: accountsError } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .order('account_code');

  if (accountsError) {
    console.error('[ReportsPage] Accounts error:', accountsError);
  }

  // Fetch Entries (Limited for performance safety)
  // Optimization: In production, use a Database View or RPC for aggregation
  const { data: entries, error: entriesError } = await supabase
    .from('ledger_entry')
    .select('account_debit, account_credit, amount')
    .limit(2000);

  if (entriesError) {
    console.error('[ReportsPage] Entries error:', entriesError);
  }

  // Server-Side Aggregation (O(N) Complexity)
  const balanceMap = new Map<string, { debit: number, credit: number }>();

  (entries || []).forEach(e => {
    // Debit Side
    if (!balanceMap.has(e.account_debit)) {
      balanceMap.set(e.account_debit, { debit: 0, credit: 0 });
    }
    const debitAcc = balanceMap.get(e.account_debit)!;
    debitAcc.debit += e.amount;

    // Credit Side
    if (!balanceMap.has(e.account_credit)) {
      balanceMap.set(e.account_credit, { debit: 0, credit: 0 });
    }
    const creditAcc = balanceMap.get(e.account_credit)!;
    creditAcc.credit += e.amount;
  });

  const trialBalanceData = (accounts || []).map(acc => {
    const stats = balanceMap.get(acc.id) || { debit: 0, credit: 0 };
    const debitSum = stats.debit;
    const creditSum = stats.credit;

    let finalBalance = 0;
    if (acc.normal_balance === 'debit') {
      finalBalance = debitSum - creditSum;
    } else {
      finalBalance = creditSum - debitSum;
    }

    return {
      ...acc,
      debit_turnover: debitSum,
      credit_turnover: creditSum,
      ending_balance: finalBalance
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Laporan Keuangan</h2>
          <p className="text-muted-foreground">
            Ringkasan kinerja keuangan koperasi
          </p>
        </div>
      </div>

      {/* Report Navigation Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Link href="/dashboard/accounting/reports/daily">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Laporan Harian</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">Jurnal Transaksi</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/accounting/reports/billing">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rekap Tagihan</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">Jadwal Angsuran</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/accounting/reports/rat">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Arsip Dokumen RAT</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">LPJ & Notulen</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/accounting/reports/balance-sheet">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Neraca</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">Posisi Keuangan</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/accounting/reports/balance-sheet-unit">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Neraca Per Unit</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">USP vs Waserda</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/accounting/reports/income-statement">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Laba Rugi</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">Kinerja Operasional</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/accounting/reports/cash-flow">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Arus Kas</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">Aliran Kas Masuk/Keluar</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/accounting/reports/equity">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Perubahan Ekuitas</CardTitle>
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">Modal Anggota</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/accounting/reports/shu">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pembagian SHU</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">Alokasi & Distribusi</div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/accounting/reports/ratios">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Analisis Rasio</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">Kesehatan Keuangan</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Neraca Saldo (Preview)</h3>
        </div>
        <TrialBalanceTable data={trialBalanceData} />
      </div>
    </div>
  );
}
