import { createClient } from '@/lib/supabase/server';
import { BalanceSheetView } from './balance-sheet-view';
import { classifyBalanceSheet } from '@/lib/utils/accounting';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ReportService } from '@/lib/services/report-service';
import { ReportPeriodSelector } from '@/components/accounting/report-period-selector';
import { ReportExportButtons } from '@/components/accounting/report-export-buttons';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    periodId?: string;
    endDate?: string;
    unitId?: string;
  }>;
}

export default async function BalanceSheetPage(props: PageProps) {
  const searchParams = await props.searchParams;
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

  const reportService = new ReportService(supabase);

  // 1. Fetch Periods
  const { data: periods } = await supabase
    .from('accounting_period')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .order('start_date', { ascending: false });

  // 2. Determine As Of Date
  let asOfDate = new Date();
  if (searchParams.endDate) {
    asOfDate = new Date(searchParams.endDate);
  }

  // 3. Fetch Data
  const { accounts, entries, initialBalances } = await reportService.getReportDataAsOf(
    koperasiId,
    asOfDate,
    searchParams.unitId
  );

  // 4. Calculate
  const { calculateAccountBalances } = await import('@/lib/utils/accounting');
  const balances = calculateAccountBalances(accounts || [], entries || [], initialBalances);
  const reportData = classifyBalanceSheet(balances);

  const periodLabel = searchParams.periodId && searchParams.periodId !== 'current'
    ? periods?.find(p => p.id === searchParams.periodId)?.name || 'Custom Period'
    : `Per ${asOfDate.toLocaleDateString('id-ID')}`;

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
            <h1 className="text-2xl font-bold tracking-tight">Neraca (Balance Sheet)</h1>
            <p className="text-muted-foreground">
              Posisi Keuangan {periodLabel}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ReportPeriodSelector periods={periods || []} />
          <ReportExportButtons
            data={reportData}
            reportType="balance-sheet"
            period={periodLabel}
            koperasiName="Koperasi OS"
          />
        </div>
      </div>

      <BalanceSheetView data={reportData} />
    </div>
  );
}
