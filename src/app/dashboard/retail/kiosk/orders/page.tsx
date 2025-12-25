import { createClient } from '@/lib/supabase/server';
// Services
import { RetailService } from '@/lib/services/retail-service';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';

export default async function KioskOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const retailService = new RetailService(supabase);
  const orders = await retailService.getPosTransactions(
    user.user_metadata.koperasi_id, 
    50, 
    'kiosk_pending'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/retail/kiosk">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pesanan Kiosk</h1>
          <p className="text-sm text-slate-500">
            Daftar pesanan menunggu pembayaran dari Kiosk
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Antrian Pesanan</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Invoice</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders && orders.length > 0 ? (
                orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.invoice_number}</TableCell>
                    <TableCell>
                      {format(new Date(order.transaction_date), 'dd/MM/yy HH:mm', { locale: id })}
                    </TableCell>
                    <TableCell className="font-bold">
                      Rp {order.final_amount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Menunggu Bayar
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/retail/pos?resume_tx=${order.id}`}>
                        <Button size="sm">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Proses di Kasir
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Tidak ada pesanan kiosk yang menunggu.
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
