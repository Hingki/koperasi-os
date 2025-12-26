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

interface Account {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  normal_balance: 'debit' | 'credit';
  level: number;
  is_header: boolean;
}

export function CoaTable({ initialAccounts }: { initialAccounts: Account[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredAccounts = initialAccounts.filter(acc => 
    acc.account_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    acc.account_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Cari akun..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Kode Akun</TableHead>
              <TableHead>Nama Akun</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Saldo Normal</TableHead>
              <TableHead className="text-right">Level</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Tidak ada akun ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredAccounts.map((account) => (
                <TableRow key={account.id} className={account.is_header ? 'bg-slate-50 font-semibold' : ''}>
                  <TableCell className="font-mono">{account.account_code}</TableCell>
                  <TableCell>{account.account_name}</TableCell>
                  <TableCell className="capitalize">{account.account_type.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={account.normal_balance === 'debit' ? 'default' : 'secondary'} className={account.normal_balance === 'debit' ? 'bg-teal-100 text-teal-800 hover:bg-teal-200' : 'bg-orange-100 text-orange-800 hover:bg-orange-200'}>
                        {account.normal_balance.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{account.level}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
