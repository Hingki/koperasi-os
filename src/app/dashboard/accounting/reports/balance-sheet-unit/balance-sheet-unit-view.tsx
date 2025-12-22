'use client';

import { useState, useMemo } from 'react';
import { calculateAccountBalances, classifyBalanceSheet, AccountBalance } from '@/lib/utils/accounting';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Filter } from 'lucide-react';

interface LedgerEntryLite {
  account_debit: string;
  account_credit: string;
  amount: number;
  tx_type: string;
  metadata?: any;
}

interface BalanceSheetUnitViewProps {
  accounts: any[];
  entries: LedgerEntryLite[];
}

export function BalanceSheetUnitView({ accounts, entries }: BalanceSheetUnitViewProps) {
  const [selectedUnit, setSelectedUnit] = useState<string>('all');

  // Filter entries based on unit
  const filteredEntries = useMemo(() => {
    if (selectedUnit === 'all') return entries;

    return entries.filter(entry => {
      // 1. Check explicit metadata tag
      const unitTag = entry.metadata?.unit;
      if (unitTag) {
        return unitTag.toLowerCase() === selectedUnit.toLowerCase();
      }

      // 2. Infer from Transaction Type
      if (selectedUnit === 'usp') {
        return ['loan_disbursement', 'loan_repayment', 'savings_deposit', 'savings_withdrawal'].includes(entry.tx_type);
      }
      
      if (selectedUnit === 'waserda') {
        return ['retail_purchase', 'retail_sale'].includes(entry.tx_type);
      }

      return false;
    });
  }, [entries, selectedUnit]);

  // Recalculate everything based on filtered entries
  const reportData = useMemo(() => {
    const balances = calculateAccountBalances(accounts, filteredEntries);
    return classifyBalanceSheet(balances);
  }, [accounts, filteredEntries]);

  // Helper components for display (Copied from BalanceSheetView)
  const AccountRow = ({ account }: { account: AccountBalance }) => (
    <div className="flex justify-between py-1 text-sm border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 rounded">
      <span className="text-slate-600 font-mono text-xs pt-1">{account.account_code}</span>
      <span className="text-slate-700 flex-1 ml-3">{account.account_name}</span>
      <span className="font-medium">{formatCurrency(account.balance)}</span>
    </div>
  );

  const SectionTotal = ({ title, total, isMain = false }: { title: string, total: number, isMain?: boolean }) => (
    <div className={`flex justify-between py-2 px-2 ${isMain ? 'font-bold text-base bg-slate-100 rounded mt-2' : 'font-semibold text-sm mt-1'}`}>
      <span>{title}</span>
      <span>{formatCurrency(total)}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm print:hidden">
        <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter Unit Usaha:</span>
        </div>
        <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Pilih Unit" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Semua Unit (Konsolidasi)</SelectItem>
                <SelectItem value="usp">Unit Simpan Pinjam (USP)</SelectItem>
                <SelectItem value="waserda">Unit Waserda / Toko</SelectItem>
            </SelectContent>
        </Select>
        
        <div className="ml-auto">
            <Badge variant="outline">
                {filteredEntries.length} Transaksi
            </Badge>
        </div>
      </div>

      {/* Report View */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Assets Section */}
        <Card className="h-fit">
            <CardHeader className="bg-blue-50/50 py-3 border-b">
                <CardTitle className="text-lg text-blue-700">ASET (ASSETS)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
                <div>
                    <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                        Aset Lancar
                    </h3>
                    <div className="space-y-1">
                        {reportData.assets.current.map(acc => <AccountRow key={acc.id} account={acc} />)}
                        {reportData.assets.current.length === 0 && <p className="text-sm text-slate-400 pl-4 italic">Tidak ada data</p>}
                    </div>
                    <SectionTotal title="Total Aset Lancar" total={reportData.assets.current.reduce((s, a) => s + a.balance, 0)} />
                </div>

                <div>
                    <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <span className="w-1 h-4 bg-blue-700 rounded-full"></span>
                        Aset Tidak Lancar
                    </h3>
                    <div className="space-y-1">
                        {reportData.assets.nonCurrent.map(acc => <AccountRow key={acc.id} account={acc} />)}
                        {reportData.assets.nonCurrent.length === 0 && <p className="text-sm text-slate-400 pl-4 italic">Tidak ada data</p>}
                    </div>
                    <SectionTotal title="Total Aset Tidak Lancar" total={reportData.assets.nonCurrent.reduce((s, a) => s + a.balance, 0)} />
                </div>

                <SectionTotal title="TOTAL ASET" total={reportData.assets.total} isMain />
            </CardContent>
        </Card>

        {/* Liabilities & Equity Section */}
        <Card className="h-fit">
            <CardHeader className="bg-red-50/50 py-3 border-b">
                <CardTitle className="text-lg text-red-700">LIABILITAS & EKUITAS</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
                {/* Liabilities */}
                <div>
                    <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <span className="w-1 h-4 bg-red-500 rounded-full"></span>
                        Liabilitas Jangka Pendek
                    </h3>
                    <div className="space-y-1">
                        {reportData.liabilities.current.map(acc => <AccountRow key={acc.id} account={acc} />)}
                        {reportData.liabilities.current.length === 0 && <p className="text-sm text-slate-400 pl-4 italic">Tidak ada data</p>}
                    </div>
                    <SectionTotal title="Total Liabilitas Jk. Pendek" total={reportData.liabilities.current.reduce((s, a) => s + a.balance, 0)} />
                </div>

                <div>
                    <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <span className="w-1 h-4 bg-red-700 rounded-full"></span>
                        Liabilitas Jangka Panjang
                    </h3>
                    <div className="space-y-1">
                        {reportData.liabilities.longTerm.map(acc => <AccountRow key={acc.id} account={acc} />)}
                        {reportData.liabilities.longTerm.length === 0 && <p className="text-sm text-slate-400 pl-4 italic">Tidak ada data</p>}
                    </div>
                    <SectionTotal title="Total Liabilitas Jk. Panjang" total={reportData.liabilities.longTerm.reduce((s, a) => s + a.balance, 0)} />
                </div>

                {/* Equity */}
                <div>
                    <h3 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
                        <span className="w-1 h-4 bg-green-600 rounded-full"></span>
                        Ekuitas
                    </h3>
                    <div className="space-y-1">
                        {reportData.equity.accounts.map(acc => <AccountRow key={acc.id} account={acc} />)}
                        
                        {/* Current Earnings (calculated) */}
                        <div className="flex justify-between py-1 text-sm border-b border-slate-50 px-2 rounded bg-green-50/50">
                            <span className="text-slate-600 font-mono text-xs pt-1">3-9999</span>
                            <span className="text-slate-700 flex-1 ml-3 font-medium">SHU Tahun Berjalan</span>
                            <span className="font-bold text-green-700">{formatCurrency(reportData.equity.currentEarnings)}</span>
                        </div>
                    </div>
                    <SectionTotal title="Total Ekuitas" total={reportData.equity.total} />
                </div>

                <SectionTotal title="TOTAL LIABILITAS & EKUITAS" total={reportData.liabilities.total + reportData.equity.total} isMain />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
