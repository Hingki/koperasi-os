'use client';

import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  normal_balance: 'debit' | 'credit';
}

interface Entry {
  account_debit: string;
  account_credit: string;
  amount: number;
}

export function TrialBalanceTable({ data }: { data: any[] }) {
  
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  const totalDebit = data.reduce((sum, acc) => acc.normal_balance === 'debit' ? sum + acc.ending_balance : sum, 0);
  const totalCredit = data.reduce((sum, acc) => acc.normal_balance === 'credit' ? sum + acc.ending_balance : sum, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Kode Akun</TableHead>
              <TableHead>Nama Akun</TableHead>
              <TableHead>Posisi</TableHead>
              <TableHead className="text-right">Mutasi Debit</TableHead>
              <TableHead className="text-right">Mutasi Kredit</TableHead>
              <TableHead className="text-right font-bold">Saldo Akhir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((acc) => (
              <TableRow key={acc.id}>
                <TableCell className="font-mono">{acc.account_code}</TableCell>
                <TableCell>{acc.account_name}</TableCell>
                <TableCell className="capitalize text-slate-500 text-xs">{acc.normal_balance}</TableCell>
                <TableCell className="text-right text-slate-500">{formatMoney(acc.debit_turnover)}</TableCell>
                <TableCell className="text-right text-slate-500">{formatMoney(acc.credit_turnover)}</TableCell>
                <TableCell className="text-right font-medium">
                    {formatMoney(acc.ending_balance)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-slate-50 font-bold">
                <TableCell colSpan={3} className="text-right">Total (Balance Check)</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">
                    {formatMoney(totalDebit)} / {formatMoney(totalCredit)}
                </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
