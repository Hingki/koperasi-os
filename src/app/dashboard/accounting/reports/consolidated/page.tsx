import { createClient } from '@/lib/supabase/server';
import { ReportService } from '@/lib/services/report-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeSelector } from '@/components/reports/date-range-selector';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ConsolidatedReportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  const { data: member } = await supabase.from('member').select('koperasi_id').eq('user_id', user.id).maybeSingle();
  let koperasiId = member?.koperasi_id;
  if (!koperasiId) {
    const { data: kop } = await supabase.from('koperasi').select('id').limit(1).maybeSingle();
    koperasiId = kop?.id;
  }
  if (!koperasiId) return <div>Koperasi not found</div>;

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startDateStr = typeof params.startDate === 'string' ? params.startDate : startOfMonth.toISOString().split('T')[0];
  const endDateStr = typeof params.endDate === 'string' ? params.endDate : today.toISOString().split('T')[0];

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const reportService = new ReportService(supabase);
  const income = await reportService.getIncomeStatement(koperasiId, startDate, endDate);
  const balance = await reportService.getBalanceSheet(koperasiId, endDate);

  const totalRevenue = income.summary.total_revenue;
  const totalExpenses = income.summary.total_expenses;
  const netIncome = income.summary.net_income;
  const totalAssets = balance.summary.total_assets;
  const totalLiabEq = balance.summary.total_liabilities_equity;

  // KPI: Outstanding Loan Receivable (USP)
  const { data: activeLoans } = await supabase
    .from('loans')
    .select('remaining_principal, status')
    .eq('koperasi_id', koperasiId)
    .eq('status', 'active');
  const outstandingLoan = (activeLoans || []).reduce((sum, l) => sum + Number(l.remaining_principal || 0), 0);
  const activeLoanCount = (activeLoans || []).length;

  // KPI: Penjualan Farmasi per periode (sum credit to SALES_REVENUE_PHARMACY)
  const { data: pharmacyRevenueAcc } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('koperasi_id', koperasiId)
    .eq('account_code', '4-2002')
    .maybeSingle();
  let pharmacySales = 0;
  if (pharmacyRevenueAcc?.id) {
    const { data: pharmEntries } = await supabase
      .from('ledger_entry')
      .select('account_credit, amount, book_date')
      .eq('koperasi_id', koperasiId)
      .eq('account_credit', pharmacyRevenueAcc.id)
      .gte('book_date', startDateStr)
      .lte('book_date', endDateStr);
    pharmacySales = (pharmEntries || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }
  const { data: invMedAcc } = await supabase
    .from('chart_of_accounts')
    .select('id')
    .eq('koperasi_id', koperasiId)
    .eq('account_code', '1-1402')
    .maybeSingle();
  let pharmacyCOGS = 0;
  if (invMedAcc?.id) {
    const { data: cogsEntries } = await supabase
      .from('ledger_entry')
      .select('account_credit, amount, book_date')
      .eq('koperasi_id', koperasiId)
      .eq('account_credit', invMedAcc.id)
      .gte('book_date', startDateStr)
      .lte('book_date', endDateStr);
    pharmacyCOGS = (cogsEntries || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }
  const pharmacyGrossMargin = pharmacySales - pharmacyCOGS

  const { data: paidSchedules } = await supabase
    .from('loan_repayment_schedule')
    .select('paid_amount, paid_at, status')
    .eq('koperasi_id', koperasiId)
    .gte('paid_at', `${startDateStr}T00:00:00.000Z`)
    .lte('paid_at', `${endDateStr}T23:59:59.999Z`);
  const totalPaidInPeriod = (paidSchedules || []).reduce((s, r) => s + Number(r.paid_amount || 0), 0);
  const countPaid = (paidSchedules || []).filter(r => Number(r.paid_amount || 0) > 0).length;
  const avgMonthlyInstallmentPaid = countPaid > 0 ? totalPaidInPeriod / countPaid : 0;

  const { data: loanRepayEntries } = await supabase
    .from('ledger_entry')
    .select('amount, book_date, tx_type, account_debit')
    .eq('koperasi_id', koperasiId)
    .eq('tx_type', 'loan_repayment')
    .gte('book_date', startDateStr)
    .lte('book_date', endDateStr);
  const weeks = 4
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const startMs = startDate.getTime()
  const repayTrend = Array.from({ length: weeks }).map(() => 0)
  ;(loanRepayEntries || []).forEach(e => {
    const idx = Math.floor((new Date(e.book_date).getTime() - startMs) / msPerWeek)
    const bucket = Math.max(0, Math.min(weeks - 1, idx))
    repayTrend[bucket] += Number(e.amount || 0)
  })
  const { data: pharmRevenueEntries } = await supabase
    .from('ledger_entry')
    .select('amount, book_date, account_credit')
    .eq('koperasi_id', koperasiId)
    .eq('account_credit', pharmacyRevenueAcc?.id || '')
    .gte('book_date', startDateStr)
    .lte('book_date', endDateStr);
  const pharmTrend = Array.from({ length: weeks }).map(() => 0)
  ;(pharmRevenueEntries || []).forEach(e => {
    const idx = Math.floor((new Date(e.book_date).getTime() - startMs) / msPerWeek)
    const bucket = Math.max(0, Math.min(weeks - 1, idx))
    pharmTrend[bucket] += Number(e.amount || 0)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/accounting/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Laporan Konsolidasi</h1>
            <p className="text-muted-foreground">
              Ringkasan realtime menggabungkan transaksi Simpan Pinjam dan Farmasi
            </p>
          </div>
        </div>
      </div>

      <DateRangeSelector baseUrl="/dashboard/accounting/reports/consolidated" />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kinerja Operasional (Laba Rugi)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Total Pendapatan</span>
              <span className="font-semibold">{formatCurrency(totalRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Beban</span>
              <span className="font-semibold">{formatCurrency(totalExpenses)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>SHU / Laba Bersih</span>
              <span className="font-bold">{formatCurrency(netIncome)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posisi Keuangan (Neraca)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Total Aset</span>
              <span className="font-semibold">{formatCurrency(totalAssets)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Liabilitas + Ekuitas</span>
              <span className="font-semibold">{formatCurrency(totalLiabEq)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>Status</span>
              <span className={`font-bold ${Math.abs(totalAssets - totalLiabEq) < 1 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(totalAssets - totalLiabEq) < 1 ? 'Seimbang' : 'Tidak Seimbang'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>USP — Outstanding Loan Receivable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Total Piutang Pinjaman</span>
              <span className="font-bold">{formatCurrency(outstandingLoan)}</span>
            </div>
            <div className="flex justify-between">
              <span>Jumlah Pinjaman Aktif</span>
              <span className="font-semibold">{activeLoanCount}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Posisi per {endDateStr}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Farmasi — Penjualan Periode</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Total Penjualan</span>
              <span className="font-bold">{formatCurrency(pharmacySales)}</span>
            </div>
            <div className="flex justify-between">
              <span>Gross Margin</span>
              <span className="font-semibold">{formatCurrency(pharmacyGrossMargin)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Periode {startDateStr} s/d {endDateStr}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>USP — Rata-rata Angsuran Dibayar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Rata-rata per transaksi</span>
              <span className="font-bold">{formatCurrency(avgMonthlyInstallmentPaid)}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Dari {countPaid} pembayaran pada periode
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tren 4 Minggu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>USP Pembayaran</span>
              <span className="font-semibold">{repayTrend.map(v => formatCurrency(v)).join(' • ')}</span>
            </div>
            <div className="flex justify-between">
              <span>Farmasi Pendapatan</span>
              <span className="font-semibold">{pharmTrend.map(v => formatCurrency(v)).join(' • ')}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Minggu berturut dari awal periode
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/accounting/reports/income-statement">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Detail Laba Rugi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Lihat rincian akun pendapatan dan beban</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/accounting/reports/balance-sheet">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Detail Neraca</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Lihat rincian aset, liabilitas, dan ekuitas</div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/accounting/reports/balance-sheet-unit">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle>Per Unit (USP vs Waserda)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Filter kontribusi Simpan Pinjam dan Toko</div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
