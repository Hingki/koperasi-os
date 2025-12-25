import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function TransactionsReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const retailService = new RetailService(supabase);
  const transactions = await retailService.getPosTransactions(user.user_metadata.koperasi_id, 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Transaksi</h1>
        <p className="text-sm text-slate-500">
          Daftar 100 transaksi terakhir.
        </p>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Pembayaran</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions?.map((tx) => (
              <TableRow key={tx.id}>
                <TableCell className="font-medium">{tx.invoice_number}</TableCell>
                <TableCell>
                  {format(new Date(tx.transaction_date), 'dd MMM yyyy HH:mm', { locale: id })}
                </TableCell>
                <TableCell>{tx.customer_name || '-'}</TableCell>
                <TableCell>Rp {tx.final_amount.toLocaleString('id-ID')}</TableCell>
                <TableCell className="capitalize">{tx.payment_method?.replace('_', ' ')}</TableCell>
                <TableCell>
                  <Badge variant={tx.payment_status === 'paid' ? 'default' : 'secondary'}>
                    {tx.payment_status === 'paid' ? 'Lunas' : tx.payment_status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {(!transactions || transactions.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  Belum ada data transaksi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
