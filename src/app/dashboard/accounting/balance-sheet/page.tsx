import { createClient } from '@/lib/supabase/server';
import { ReportService, BalanceSheetItem, BalanceSheetSection } from '@/lib/services/report-service';
import { DateSelector } from '@/components/reports/date-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { redirect } from 'next/navigation';

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  const asOfDateStr = (resolvedSearchParams.asOfDate as string) || new Date().toISOString().split('T')[0];
  const asOfDate = new Date(asOfDateStr);

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
      report = await reportService.getBalanceSheet(koperasiId, asOfDate);
  } catch (e: any) {
      error = e.message;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Laporan Posisi Keuangan (Neraca)</h1>
        <p className="text-muted-foreground">Standar Akuntansi Keuangan Entitas Privat (SAK-EP)</p>
      </div>

      <DateSelector baseUrl="/dashboard/accounting/balance-sheet" />

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
          Error: {error}
        </div>
      )}

      {report && (
        <div className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Left Column: Assets */}
             <div className="space-y-6">
               <SectionCard title="ASET" section={report.assets} />
             </div>

             {/* Right Column: Liabilities & Equity */}
             <div className="space-y-6">
               <SectionCard title="KEWAJIBAN" section={report.liabilities} />
               <SectionCard title="EKUITAS" section={report.equity} />
               
               <Card className="bg-slate-50 border-slate-200">
                 <CardContent className="pt-6">
                   <div className="flex justify-between items-center font-bold text-lg">
                     <span>TOTAL KEWAJIBAN DAN EKUITAS</span>
                     <span>{formatCurrency(report.summary.total_liabilities_equity)}</span>
                   </div>
                 </CardContent>
               </Card>
             </div>
           </div>
           
           {/* Verification */}
           {!report.summary.is_balanced && (
             <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md border border-yellow-200">
               Warning: Balance Sheet is not balanced. Discrepancy: {formatCurrency(report.summary.discrepancy)}
             </div>
           )}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, section }: { title: string, section: BalanceSheetSection }) {
  return (
    <Card>
      <CardHeader className="pb-4 border-b bg-slate-50/50">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-1">
          {section.items.map((item) => (
            <AccountRow key={item.account_code} item={item} />
          ))}
        </div>
        <div className="border-t mt-4 pt-4 flex justify-between items-center font-bold text-base">
          <span>TOTAL {title}</span>
          <span>{formatCurrency(section.total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountRow({ item }: { item: BalanceSheetItem }) {
  const hasChildren = item.children && item.children.length > 0;
  const indentClass = getIndentClass(item.level);
  
  return (
    <div className="text-sm">
      <div className={cn(
          "flex justify-between py-1.5", 
          item.level <= 2 ? "font-semibold text-slate-900 mt-2" : "text-slate-600 hover:bg-slate-50 rounded px-1"
        )}>
        <span className={indentClass}>
          {item.level > 2 && <span className="mr-2 text-slate-400">•</span>}
          {item.account_name} <span className="text-xs text-slate-400 ml-1">({item.account_code})</span>
        </span>
        <span className={cn(hasChildren ? "hidden" : "block")}>{formatCurrency(item.balance)}</span>
        {hasChildren && <span className="text-slate-400 text-xs italic"></span>}
      </div>
      {hasChildren && (
        <div className="ml-2 border-l border-slate-100 pl-2">
          {item.children.map(child => (
            <AccountRow key={child.account_code} item={child} />
          ))}
          <div className="flex justify-between py-1 font-medium text-slate-700 text-xs border-t border-slate-100 mt-1">
             <span className={indentClass}>Total {item.account_name}</span>
             <span>{formatCurrency(item.balance)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

function getIndentClass(level: number): string {
  const depth = Math.max(0, level - 2);
  // Map depth to tailwind padding-left classes
  // 1 level = 16px = 4 tailwind units (pl-4)
  const indentMap: Record<number, string> = {
    0: 'pl-0',
    1: 'pl-4',
    2: 'pl-8',
    3: 'pl-12',
    4: 'pl-16',
    5: 'pl-20',
    6: 'pl-24',
    7: 'pl-28',
    8: 'pl-32',
  };
  
  return indentMap[depth] || 'pl-8'; // Default fallback
}
