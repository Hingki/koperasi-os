import { createClient } from '@/lib/supabase/server';
import { ReportService, CashFlowSection } from '@/lib/services/report-service';
import { DateRangeSelector } from '@/components/reports/date-range-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultStart = startOfMonth.toISOString().split('T')[0];
  const defaultEnd = today.toISOString().split('T')[0];

  const startDateStr = (resolvedSearchParams.startDate as string) || defaultStart;
  const endDateStr = (resolvedSearchParams.endDate as string) || defaultEnd;

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let koperasiId = user.user_metadata?.koperasi_id;
  if (!koperasiId) {
      const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
      koperasiId = koperasi?.id;
  }

  if (!koperasiId) {
      return (
        <div className="p-6">
          <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
            Data Koperasi tidak ditemukan. Silakan hubungi administrator.
          </div>
        </div>
      );
  }

  const reportService = new ReportService(supabase);
  let report = null;
  let error = null;

  try {
      report = await reportService.getCashFlowStatement(koperasiId, startDate, endDate);
  } catch (e: any) {
      error = e.message;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Laporan Arus Kas</h1>
        <p className="text-muted-foreground">Periode: {startDateStr} s/d {endDateStr}</p>
      </div>

      <DateRangeSelector baseUrl="/dashboard/accounting/cash-flow" />

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
          Error: {error}
        </div>
      )}

      {report && (
        <div className="space-y-6">
             <CashFlowSectionCard 
                title="ARUS KAS DARI AKTIVITAS OPERASIONAL" 
                section={report.operating_activities} 
                totalLabel="Jumlah Arus Kas Operasional"
             />

             <CashFlowSectionCard 
                title="ARUS KAS DARI AKTIVITAS INVESTASI" 
                section={report.investing_activities} 
                totalLabel="Jumlah Arus Kas Investasi"
             />

             <CashFlowSectionCard 
                title="ARUS KAS DARI AKTIVITAS PENDANAAN" 
                section={report.financing_activities} 
                totalLabel="Jumlah Arus Kas Pendanaan"
             />
             
             <Card className="bg-slate-50 border-slate-200">
               <CardContent className="pt-6 space-y-4">
                 <div className="flex justify-between items-center font-bold text-lg text-slate-800">
                   <span>KENAIKAN (PENURUNAN) BERSIH KAS</span>
                   <span className={report.summary.net_change_in_cash < 0 ? 'text-red-600' : 'text-green-700'}>
                     {formatCurrency(report.summary.net_change_in_cash)}
                   </span>
                 </div>
                 <div className="flex justify-between items-center text-slate-600">
                   <span>Saldo Kas Awal Periode</span>
                   <span>{formatCurrency(report.summary.beginning_cash_balance)}</span>
                 </div>
                 <div className="border-t border-slate-300 pt-4 flex justify-between items-center font-bold text-xl text-slate-900">
                   <span>SALDO KAS AKHIR PERIODE</span>
                   <span>{formatCurrency(report.summary.ending_cash_balance)}</span>
                 </div>
               </CardContent>
             </Card>
        </div>
      )}
    </div>
  );
}

function CashFlowSectionCard({ 
    title, 
    section, 
    totalLabel 
}: { 
    title: string, 
    section: CashFlowSection, 
    totalLabel: string 
}) {
  return (
    <Card>
      <CardHeader className="pb-4 border-b bg-slate-50/50">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {section.items.length === 0 ? (
            <p className="text-slate-400 italic text-sm">Tidak ada transaksi pada periode ini.</p>
        ) : (
            <div className="space-y-2">
              {section.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700">{item.name}</span>
                  <span className={item.amount < 0 ? 'text-red-600' : 'text-slate-900'}>
                    {item.amount < 0 ? `(${formatCurrency(Math.abs(item.amount))})` : formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
        )}
        <div className="border-t mt-4 pt-4 flex justify-between items-center font-bold text-base text-slate-900">
          <span>{totalLabel}</span>
          <span className={section.total < 0 ? 'text-red-600' : ''}>
            {section.total < 0 ? `(${formatCurrency(Math.abs(section.total))})` : formatCurrency(section.total)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
