'use client';

import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface AccountBalance {
  id: string;
  account_code: string;
  account_name: string;
  balance: number;
}

interface BalanceSheetData {
  assets: {
    current: AccountBalance[];
    nonCurrent: AccountBalance[];
    total: number;
  };
  liabilities: {
    current: AccountBalance[];
    longTerm: AccountBalance[];
    total: number;
  };
  equity: {
    accounts: AccountBalance[];
    currentEarnings: number;
    total: number;
  };
}

export function BalanceSheetView({ data }: { data: BalanceSheetData }) {
  const AccountRow = ({ account }: { account: AccountBalance }) => (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-slate-600 pl-4">{account.account_code} - {account.account_name}</span>
      <span className="font-medium">{formatCurrency(account.balance)}</span>
    </div>
  );

  const SectionTotal = ({ title, total, isMain = false }: { title: string, total: number, isMain?: boolean }) => (
    <div className={`flex justify-between py-2 ${isMain ? 'font-bold text-base border-t border-slate-900 mt-2' : 'font-semibold text-sm border-t mt-1'}`}>
      <span>{title}</span>
      <span>{formatCurrency(total)}</span>
    </div>
  );

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Assets Section */}
      <Card>
        <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-lg text-blue-700">ASET (ASSETS)</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
            <div>
                <h3 className="font-semibold text-slate-800 mb-2">Aset Lancar (Current Assets)</h3>
                <div className="space-y-1">
                    {data.assets.current.map(acc => <AccountRow key={acc.id} account={acc} />)}
                    {data.assets.current.length === 0 && <p className="text-sm text-slate-400 pl-4">Tidak ada data</p>}
                </div>
                <SectionTotal title="Total Aset Lancar" total={data.assets.current.reduce((s, a) => s + a.balance, 0)} />
            </div>

            <div>
                <h3 className="font-semibold text-slate-800 mb-2">Aset Tidak Lancar (Non-Current Assets)</h3>
                <div className="space-y-1">
                    {data.assets.nonCurrent.map(acc => <AccountRow key={acc.id} account={acc} />)}
                    {data.assets.nonCurrent.length === 0 && <p className="text-sm text-slate-400 pl-4">Tidak ada data</p>}
                </div>
                <SectionTotal title="Total Aset Tidak Lancar" total={data.assets.nonCurrent.reduce((s, a) => s + a.balance, 0)} />
            </div>

            <SectionTotal title="TOTAL ASET" total={data.assets.total} isMain />
        </CardContent>
      </Card>

      {/* Liabilities & Equity Section */}
      <Card>
        <CardHeader className="bg-slate-50 py-3">
            <CardTitle className="text-lg text-red-700">LIABILITAS & EKUITAS</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-6">
            {/* Liabilities */}
            <div>
                <h3 className="font-semibold text-slate-800 mb-2">Liabilitas Jangka Pendek (Current Liabilities)</h3>
                <div className="space-y-1">
                    {data.liabilities.current.map(acc => <AccountRow key={acc.id} account={acc} />)}
                    {data.liabilities.current.length === 0 && <p className="text-sm text-slate-400 pl-4">Tidak ada data</p>}
                </div>
                <SectionTotal title="Total Liabilitas Jangka Pendek" total={data.liabilities.current.reduce((s, a) => s + a.balance, 0)} />
            </div>

            <div>
                <h3 className="font-semibold text-slate-800 mb-2">Liabilitas Jangka Panjang (Long-Term Liabilities)</h3>
                <div className="space-y-1">
                    {data.liabilities.longTerm.map(acc => <AccountRow key={acc.id} account={acc} />)}
                    {data.liabilities.longTerm.length === 0 && <p className="text-sm text-slate-400 pl-4">Tidak ada data</p>}
                </div>
                <SectionTotal title="Total Liabilitas Jangka Panjang" total={data.liabilities.longTerm.reduce((s, a) => s + a.balance, 0)} />
            </div>

            <SectionTotal title="Total Liabilitas" total={data.liabilities.total} />

            <Separator className="my-4" />

            {/* Equity */}
            <div>
                <h3 className="font-semibold text-slate-800 mb-2">Ekuitas (Equity)</h3>
                <div className="space-y-1">
                    {data.equity.accounts.map(acc => <AccountRow key={acc.id} account={acc} />)}
                    
                    {/* SHU Current Year */}
                    <div className="flex justify-between py-1 text-sm bg-yellow-50">
                        <span className="text-slate-600 pl-4 font-medium">SHU Tahun Berjalan (Current Earnings)</span>
                        <span className="font-medium">{formatCurrency(data.equity.currentEarnings)}</span>
                    </div>
                </div>
                <SectionTotal title="Total Ekuitas" total={data.equity.total} />
            </div>

            <SectionTotal title="TOTAL LIABILITAS & EKUITAS" total={data.liabilities.total + data.equity.total} isMain />
        </CardContent>
      </Card>
    </div>
  );
}
