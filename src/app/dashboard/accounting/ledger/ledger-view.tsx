'use client';

import { useState } from 'react';
import { getLedgerEntries } from '@/lib/actions/accounting';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  normal_balance: 'debit' | 'credit';
}

interface LedgerEntry {
  id: string;
  entry_date: string;
  tx_reference: string;
  description: string;
  amount: number;
  account_debit: string;
  account_credit: string;
}

export function LedgerView({ accounts }: { accounts: Account[] }) {
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!selectedAccount) return;
    
    setLoading(true);
    setSearched(true);
    try {
        const data = await getLedgerEntries(selectedAccount, startDate, endDate);
        setEntries(data as any);
    } catch (error) {
        console.error(error);
        alert('Failed to fetch ledger entries');
    } finally {
        setLoading(false);
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  // Calculate Running Balance
  let runningBalance = 0;
  const currentAccount = accounts.find(a => a.id === selectedAccount);
  const normalBalance = currentAccount?.normal_balance || 'debit';

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="space-y-2 md:col-span-2">
            <Label htmlFor="account_filter">Pilih Akun</Label>
            <select 
                id="account_filter"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                title="Filter Akun"
            >
                <option value="">-- Pilih Akun --</option>
                {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                        {acc.account_code} - {acc.account_name} ({acc.normal_balance})
                    </option>
                ))}
            </select>
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="start_date">Dari Tanggal</Label>
            <input 
                type="date" 
                id="start_date"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                title="Tanggal mulai"
                placeholder="YYYY-MM-DD"
            />
        </div>

        <div className="space-y-2">
            <Label htmlFor="end_date">Sampai Tanggal</Label>
             <input 
                type="date" 
                id="end_date"
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                title="Tanggal akhir"
                placeholder="YYYY-MM-DD"
            />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSearch} disabled={!selectedAccount || loading} className="bg-red-600 hover:bg-red-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Tampilkan Data
        </Button>
      </div>

      {/* Table */}
      {searched && (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Ref</TableHead>
                        <TableHead>Keterangan</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Kredit</TableHead>
                        <TableHead className="text-right font-bold">Saldo</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {entries.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                Tidak ada transaksi ditemukan pada periode ini.
                            </TableCell>
                        </TableRow>
                    ) : (
                        entries.map((entry) => {
                            const isDebit = entry.account_debit === selectedAccount;
                            const debitAmount = isDebit ? entry.amount : 0;
                            const creditAmount = !isDebit ? entry.amount : 0;
                            
                            // Running Balance Logic
                            if (normalBalance === 'debit') {
                                runningBalance += (debitAmount - creditAmount);
                            } else {
                                runningBalance += (creditAmount - debitAmount);
                            }

                            return (
                                <TableRow key={entry.id}>
                                    <TableCell className="text-xs">{formatDate(entry.entry_date)}</TableCell>
                                    <TableCell className="text-xs font-mono">{entry.tx_reference}</TableCell>
                                    <TableCell>{entry.description}</TableCell>
                                    <TableCell className="text-right text-slate-600">
                                        {debitAmount > 0 ? formatMoney(debitAmount) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right text-slate-600">
                                        {creditAmount > 0 ? formatMoney(creditAmount) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {formatMoney(runningBalance)}
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
      )}
    </div>
  );
}
