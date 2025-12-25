import { createClient } from '@/lib/supabase/server';
// Services
import { RetailService } from '@/lib/services/retail-service';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SalesReturnsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const retailService = new RetailService(supabase);
  const returns = await retailService.getSalesReturns(user.user_metadata.koperasi_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Retur Penjualan</h1>
          <p className="text-sm text-slate-500">
            Kelola pengembalian barang dari pelanggan
          </p>
        </div>
        <Link href="/dashboard/retail/sales/returns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Buat Retur Baru
          </Button>
        </Link>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Retur</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Invoice Asal</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Refund</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns && returns.length > 0 ? (
              returns.map((ret: any) => (
                <TableRow key={ret.id}>
                  <TableCell className="font-medium">{ret.return_number}</TableCell>
                  <TableCell>
                    {format(new Date(ret.return_date), 'dd MMM yyyy', { locale: id })}
                  </TableCell>
                  <TableCell>{ret.transaction?.invoice_number || '-'}</TableCell>
                  <TableCell>{ret.transaction?.customer_name || 'Umum'}</TableCell>
                  <TableCell>
                    <Badge variant={ret.status === 'completed' ? 'default' : 'secondary'}>
                      {ret.status === 'completed' ? 'Selesai' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    Rp {ret.total_refund_amount.toLocaleString('id-ID')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Belum ada data retur penjualan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
