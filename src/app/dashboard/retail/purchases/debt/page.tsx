import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { DebtPaymentDialog } from './debt-payment-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function DebtPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const retailService = new RetailService(supabase);
  const unpaidPurchases = await retailService.getUnpaidPurchases(user.user_metadata.koperasi_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Utang Pembelian</h1>
          <p className="text-sm text-slate-500">
            Daftar pembelian yang belum lunas (Utang Dagang).
          </p>
        </div>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>No. Faktur</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead>Total Tagihan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unpaidPurchases && unpaidPurchases.length > 0 ? (
              unpaidPurchases.map((purchase) => (
                <TableRow key={purchase.id}>
                  <TableCell>
                    {format(new Date(purchase.purchase_date), 'dd MMM yyyy', { locale: id })}
                  </TableCell>
                  <TableCell className="font-medium">{purchase.invoice_number}</TableCell>
                  <TableCell>{purchase.supplier?.name || '-'}</TableCell>
                  <TableCell>
                    {purchase.due_date ? format(new Date(purchase.due_date), 'dd MMM yyyy', { locale: id }) : '-'}
                  </TableCell>
                  <TableCell>{formatCurrency(purchase.total_amount)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      Belum Lunas
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DebtPaymentDialog purchase={purchase} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                  Tidak ada data utang pembelian.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}