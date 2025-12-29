import { createClient } from '@/lib/supabase/server';
import { IncomeStatementView } from './income-statement-view';
import { classifyIncomeStatement } from '@/lib/utils/accounting';
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

export default async function IncomeStatementPage(props: PageProps) {
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

  // 1. Fetch Accounting Periods for Selector
  const { data: periods } = await supabase
    .from('accounting_period')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .order('start_date', { ascending: false });

  // 2. Determine Period Dates
  let startDate = new Date(new Date().getFullYear(), 0, 1); // Default to Jan 1st current year
  let endDate = new Date(); // Default to today

  if (searchParams.startDate && searchParams.endDate) {
      startDate = new Date(searchParams.startDate);
      endDate = new Date(searchParams.endDate);
  } else if (periods && periods.length > 0) {
      // Default to the most recent open period or just current year if no params
      // Let's default to current year if "current" or no param
      // But if user selected a period, params would be set by selector.
      // If no params, we use defaults above.
  }
  
  // 3. Fetch Data via Service
  // Using getReportData to get raw entries and accounts, then classify locally
  // This maintains compatibility with existing View
  const { accounts, entries } = await reportService.getReportData(
      koperasiId, 
      startDate, 
      endDate, 
      searchParams.unitId
  );

  // 4. Calculate & Classify
  // We need to calculate balances first. 
  // We can import calculateAccountBalances from utils or assume ReportService helper?
  // I'll import it from utils to be safe.
  const { calculateAccountBalances } = await import('@/lib/utils/accounting');
  const balances = calculateAccountBalances(accounts || [], entries || []);
  const reportData = classifyIncomeStatement(balances);

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
                <h1 className="text-2xl font-bold tracking-tight">Laporan Laba Rugi</h1>
                <p className="text-muted-foreground">
                    {periodLabel}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <ReportPeriodSelector periods={periods || []} />
            <ReportExportButtons 
                data={reportData} 
                reportType="income-statement" 
                period={periodLabel} 
                koperasiName="Koperasi OS" 
            />
        </div>
      </div>

      <IncomeStatementView data={reportData} />
    </div>
  );
}
