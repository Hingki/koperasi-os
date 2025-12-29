import { createClient } from '@/lib/supabase/server';
import { CashFlowView } from './cash-flow-view';
import { classifyCashFlow } from '@/lib/utils/accounting';
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
        startDate?: string;
        endDate?: string;
        unitId?: string;
    }>;
}

export default async function CashFlowPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  // Fetch Koperasi ID
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

  // 2. Determine Period Dates
  let startDate = new Date(new Date().getFullYear(), 0, 1);
  let endDate = new Date();

  if (searchParams.startDate && searchParams.endDate) {
      startDate = new Date(searchParams.startDate);
      endDate = new Date(searchParams.endDate);
  }

  // 3. Fetch Data via Service
  const { accounts, entries } = await reportService.getReportData(
      koperasiId, 
      startDate, 
      endDate, 
      searchParams.unitId
  );

  // 4. Calculate & Classify
  const { calculateAccountBalances } = await import('@/lib/utils/accounting');
  const balances = calculateAccountBalances(accounts || [], entries || []);
  const reportData = classifyCashFlow(balances);

  const periodLabel = searchParams.periodId && searchParams.periodId !== 'current'
    ? periods?.find(p => p.id === searchParams.periodId)?.name || 'Custom Period'
    : `Periode Berjalan (${startDate.toLocaleDateString('id-ID')} - ${endDate.toLocaleDateString('id-ID')})`;

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
                <h1 className="text-2xl font-bold tracking-tight">Laporan Arus Kas (Cash Flow)</h1>
                <p className="text-muted-foreground">
                    {periodLabel}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <ReportPeriodSelector periods={periods || []} />
            <ReportExportButtons 
                data={reportData} 
                reportType="cash-flow" 
                period={periodLabel} 
                koperasiName="Koperasi OS" 
            />
        </div>
      </div>

      <CashFlowView data={reportData} />
    </div>
  );
}
