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
import { Button } from '@/components/ui/button';
import { Search, Edit, Trash2, Plus } from 'lucide-react';
import Link from 'next/link';
import { deleteAccount } from '@/lib/actions/accounting';

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

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus akun ini?')) {
        const result = await deleteAccount(id);
        if (result?.error) {
            alert(result.error);
        }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input
            placeholder="Cari akun..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
        <Link href="/dashboard/settings/coa/new">
            <Button>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Akun
            </Button>
        </Link>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Kode Akun</TableHead>
              <TableHead>Nama Akun</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Saldo Normal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        <Link href={`/dashboard/settings/coa/${account.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="h-4 w-4 text-slate-500" />
                            </Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(account.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
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
