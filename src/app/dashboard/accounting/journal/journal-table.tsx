'use client';

import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils'; // Assuming this exists or I'll implement inline

interface JournalEntry {
  id: string;
  entry_date: string;
  tx_reference: string;
  description: string;
  amount: number;
  tx_type: string;
  debit_account: { account_code: string; account_name: string };
  credit_account: { account_code: string; account_name: string };
}

export function JournalTable({ initialEntries }: { initialEntries: JournalEntry[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredEntries = initialEntries.filter(entry => 
    entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.tx_reference.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Cari transaksi..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Tanggal</TableHead>
              <TableHead className="w-[150px]">No. Ref</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead>Debit</TableHead>
              <TableHead>Kredit</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Tidak ada data jurnal.
                </TableCell>
              </TableRow>
            ) : (
              filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-slate-600 text-sm">
                    {formatDate(entry.entry_date)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{entry.tx_reference}</TableCell>
                  <TableCell>
                    <div className="font-medium">{entry.description}</div>
                    <div className="text-xs text-slate-500 capitalize">{entry.tx_type.replace('_', ' ')}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{entry.debit_account?.account_code}</div>
                    <div className="text-xs text-slate-500">{entry.debit_account?.account_name}</div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="font-medium">{entry.credit_account?.account_code}</div>
                    <div className="text-xs text-slate-500">{entry.credit_account?.account_name}</div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(entry.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
