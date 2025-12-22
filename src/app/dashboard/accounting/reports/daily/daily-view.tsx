'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar as CalendarIcon, ArrowRightLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DailyTransaction {
  id: string;
  entry_date: string;
  tx_type: string;
  tx_reference: string;
  description: string;
  account_debit: string;
  account_credit: string;
  amount: number;
}

interface DailyViewProps {
  date: string; // YYYY-MM-DD
  transactions: DailyTransaction[];
  accountsMap: Record<string, string>; // code -> name
}

export function DailyView({ date, transactions, accountsMap }: DailyViewProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(date);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const applyDate = () => {
    setIsNavigating(true);
    router.push(`/dashboard/accounting/reports/daily?date=${selectedDate}`);
  };

  const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center bg-white p-4 rounded-lg border shadow-sm print:hidden">
        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
          <label className="text-sm font-medium text-slate-700">Pilih Tanggal</label>
          <div className="flex gap-2">
            <Input 
              type="date" 
              value={selectedDate} 
              onChange={handleDateChange} 
              className="w-full sm:w-[200px]"
            />
            <Button onClick={applyDate} disabled={isNavigating}>
              {isNavigating ? 'Loading...' : 'Tampilkan'}
            </Button>
          </div>
        </div>
        
        <div className="ml-auto flex gap-6 text-sm">
            <div className="flex flex-col items-end">
                <span className="text-muted-foreground">Jumlah Transaksi</span>
                <span className="font-bold text-lg">{transactions.length}</span>
            </div>
            <div className="flex flex-col items-end">
                <span className="text-muted-foreground">Total Volume</span>
                <span className="font-bold text-lg text-blue-600">{formatCurrency(totalVolume)}</span>
            </div>
        </div>
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader className="pb-3 border-b bg-slate-50/50">
            <CardTitle className="text-base font-medium flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-slate-500" />
                Jurnal Transaksi Harian
            </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b bg-slate-50">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground w-[100px]">Waktu</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Deskripsi / Ref</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Debit</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Kredit</th>
                            <th className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                    Tidak ada transaksi pada tanggal ini.
                                </td>
                            </tr>
                        ) : (
                            transactions.map((t) => {
                                const time = new Date(t.entry_date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <tr key={t.id} className="border-b transition-colors hover:bg-slate-50/50">
                                        <td className="p-4 align-middle font-mono text-xs text-slate-500">{time}</td>
                                        <td className="p-4 align-middle">
                                            <div className="font-medium">{t.description}</div>
                                            <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                                <Badge variant="outline" className="text-[10px] h-5 px-1 font-normal text-slate-400 border-slate-200">
                                                    {t.tx_reference}
                                                </Badge>
                                                <span className="text-[10px] text-slate-400 uppercase tracking-wider">{t.tx_type.replace(/_/g, ' ')}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="text-slate-700">{accountsMap[t.account_debit] || t.account_debit}</div>
                                            <div className="text-xs font-mono text-slate-400">{t.account_debit}</div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="text-slate-700">{accountsMap[t.account_credit] || t.account_credit}</div>
                                            <div className="text-xs font-mono text-slate-400">{t.account_credit}</div>
                                        </td>
                                        <td className="p-4 align-middle text-right font-medium">
                                            {formatCurrency(t.amount)}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
