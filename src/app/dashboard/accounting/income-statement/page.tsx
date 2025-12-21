'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { DateRangeSelector } from '@/components/reports/date-range-selector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { BalanceSheetItem, BalanceSheetSection, IncomeStatementReport } from '@/lib/services/report-service';

export default function IncomeStatementPage() {
  const searchParams = useSearchParams();
  
  // Defaults
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultStart = startOfMonth.toISOString().split('T')[0];
  const defaultEnd = today.toISOString().split('T')[0];

  const startDate = searchParams.get('startDate') || defaultStart;
  const endDate = searchParams.get('endDate') || defaultEnd;

  const [report, setReport] = useState<IncomeStatementReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/reports/income-statement?startDate=${startDate}&endDate=${endDate}`);
        if (!res.ok) {
           const errData = await res.json();
           throw new Error(errData.error || 'Failed to fetch report');
        }
        const data = await res.json();
        setReport(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [startDate, endDate]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Laporan Laba Rugi</h1>
        <p className="text-muted-foreground">Periode: {startDate} s/d {endDate}</p>
      </div>

      <DateRangeSelector baseUrl="/dashboard/accounting/income-statement" />

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md border border-red-200">
          Error: {error}
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12 text-slate-500">
            Memuat data...
        </div>
      )}

      {!loading && report && (
        <div className="space-y-8">
           <div className="space-y-6">
             <SectionCard title="PENDAPATAN USAHA" section={report.revenue} />
             <SectionCard title="BEBAN USAHA" section={report.expenses} />
             
             <Card className="bg-slate-50 border-slate-200">
               <CardContent className="pt-6">
                 <div className="flex justify-between items-center font-bold text-xl text-slate-900">
                   <span>SHU / LABA BERSIH</span>
                   <span>{formatCurrency(report.summary.net_income)}</span>
                 </div>
               </CardContent>
             </Card>
           </div>
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
