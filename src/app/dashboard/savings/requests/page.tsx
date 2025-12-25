
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WithdrawalRequestActions } from './withdrawal-request-actions';

export default async function WithdrawalRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  // Fetch Pending Requests
  const { data: requests } = await supabase
    .from('savings_withdrawal_requests')
    .select(`
      *,
      member:member(nama_lengkap, nomor_anggota),
      account:savings_accounts(account_number, product:savings_products(name))
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/savings" className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Permohonan Penarikan</h1>
            <p className="text-slate-500">Kelola permintaan penarikan saldo anggota.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Permohonan Pending</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Anggota</TableHead>
                <TableHead>Info Rekening & Bank</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests?.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>{formatDate(req.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                        <span className="font-medium">{req.member?.nama_lengkap}</span>
                        <span className="text-xs text-slate-500">{req.member?.nomor_anggota}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                        <span className="font-medium">Sumber: {req.account?.product?.name} ({req.account?.account_number})</span>
                        <span className="text-slate-600 mt-1">Tujuan: {req.bank_name} - {req.account_number}</span>
                        <span className="text-xs text-slate-500">a.n {req.account_holder}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                    {formatCurrency(req.amount)}
                  </TableCell>
                  <TableCell>
                    <WithdrawalRequestActions 
                        requestId={req.id} 
                        memberName={req.member?.nama_lengkap || ''} 
                        amount={req.amount}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {(!requests || requests.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                        <p>Tidak ada permohonan penarikan yang menunggu persetujuan.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
