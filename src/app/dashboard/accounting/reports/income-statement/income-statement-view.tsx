'use client';

import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AccountBalance {
  id: string;
  account_code: string;
  account_name: string;
  balance: number;
}

interface IncomeStatementData {
    revenue: {
        operating: AccountBalance[];
        other: AccountBalance[];
        totalOperating: number;
        totalOther: number;
        total: number;
    };
    expenses: {
        operating: AccountBalance[];
        other: AccountBalance[];
        totalOperating: number;
        totalOther: number;
        total: number;
    };
    operatingProfit: number;
    netProfit: number;
}

export function IncomeStatementView({ data }: { data: IncomeStatementData }) {
  const AccountRow = ({ account }: { account: AccountBalance }) => (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-slate-600 pl-4">{account.account_code} - {account.account_name}</span>
      <span className="font-medium">{formatCurrency(account.balance)}</span>
    </div>
  );

  const SectionTotal = ({ title, total, isMain = false, isDanger = false, isSuccess = false }: { title: string, total: number, isMain?: boolean, isDanger?: boolean, isSuccess?: boolean }) => (
    <div className={`flex justify-between py-2 ${isMain ? 'font-bold text-base border-t border-slate-900 mt-2' : 'font-semibold text-sm border-t mt-1'} ${isDanger ? 'text-red-600' : ''} ${isSuccess ? 'text-green-600' : ''}`}>
      <span>{title}</span>
      <span>{formatCurrency(total)}</span>
    </div>
  );

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Operating Revenue */}
      <Card>
        <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-lg text-emerald-700">PENDAPATAN (REVENUE)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
            <div>
                <h3 className="font-semibold text-slate-800 mb-2">Pendapatan Operasional</h3>
                <div className="space-y-1">
                    {data.revenue.operating.map(acc => <AccountRow key={acc.id} account={acc} />)}
                    {data.revenue.operating.length === 0 && <p className="text-sm text-slate-400 pl-4">Tidak ada data</p>}
                </div>
                <SectionTotal title="Total Pendapatan Operasional" total={data.revenue.totalOperating} />
            </div>

            <div>
                <h3 className="font-semibold text-slate-800 mb-2">Pendapatan Lainnya</h3>
                <div className="space-y-1">
                    {data.revenue.other.map(acc => <AccountRow key={acc.id} account={acc} />)}
                    {data.revenue.other.length === 0 && <p className="text-sm text-slate-400 pl-4">Tidak ada data</p>}
                </div>
                <SectionTotal title="Total Pendapatan Lainnya" total={data.revenue.totalOther} />
            </div>

            <SectionTotal title="TOTAL PENDAPATAN" total={data.revenue.total} isMain />
        </CardContent>
      </Card>

      {/* Operating Expenses */}
      <Card>
        <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-lg text-amber-700">BEBAN (EXPENSES)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
            <div>
                <h3 className="font-semibold text-slate-800 mb-2">Beban Operasional</h3>
                <div className="space-y-1">
                    {data.expenses.operating.map(acc => <AccountRow key={acc.id} account={acc} />)}
                    {data.expenses.operating.length === 0 && <p className="text-sm text-slate-400 pl-4">Tidak ada data</p>}
                </div>
                <SectionTotal title="Total Beban Operasional" total={data.expenses.totalOperating} />
            </div>

            <div>
                <h3 className="font-semibold text-slate-800 mb-2">Beban Lainnya</h3>
                <div className="space-y-1">
                    {data.expenses.other.map(acc => <AccountRow key={acc.id} account={acc} />)}
                    {data.expenses.other.length === 0 && <p className="text-sm text-slate-400 pl-4">Tidak ada data</p>}
                </div>
                <SectionTotal title="Total Beban Lainnya" total={data.expenses.totalOther} />
            </div>

            <SectionTotal title="TOTAL BEBAN" total={data.expenses.total} isMain />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-lg text-blue-700">RINGKASAN (SUMMARY)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
            <SectionTotal title="Laba/Rugi Operasional" total={data.operatingProfit} isMain isSuccess={data.operatingProfit > 0} isDanger={data.operatingProfit < 0} />
            <SectionTotal title="Laba/Rugi Bersih (SHU)" total={data.netProfit} isMain isSuccess={data.netProfit > 0} isDanger={data.netProfit < 0} />
        </CardContent>
      </Card>
    </div>
  );
}
