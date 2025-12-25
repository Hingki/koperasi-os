import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function ReceivablesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const retailService = new RetailService(supabase);
  const receivables = await retailService.getReceivables(user.user_metadata.koperasi_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Piutang Penjualan</h1>
          <p className="text-sm text-slate-500">
            Daftar penjualan yang belum lunas (Piutang Dagang).
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Total Tagihan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receivables && receivables.length > 0 ? (
              receivables.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    {format(new Date(tx.transaction_date), 'dd MMM yyyy HH:mm', { locale: id })}
                  </TableCell>
                  <TableCell className="font-medium">{tx.invoice_number}</TableCell>
                  <TableCell>{tx.customer_name || 'Umum'}</TableCell>
                  <TableCell>{formatCurrency(tx.final_amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {tx.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/dashboard/retail/reports/transactions/${tx.id}`}>
                      <Button variant="ghost" size="sm">Detail</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                  Tidak ada data piutang penjualan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}