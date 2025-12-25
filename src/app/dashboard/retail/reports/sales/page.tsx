import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function SalesReportPage({ searchParams }: { searchParams: { start?: string, end?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const startDate = searchParams.start ? parseISO(searchParams.start) : startOfMonth(new Date());
  const endDate = searchParams.end ? parseISO(searchParams.end) : endOfMonth(new Date());

  const retailService = new RetailService(supabase);
  const summary = await retailService.getSalesSummary(
    user.user_metadata.koperasi_id, 
    startDate, 
    endDate
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Rekap Penjualan</h1>
          <p className="text-sm text-slate-500">
            Periode: {format(startDate, 'dd MMMM yyyy', { locale: id })} - {format(endDate, 'dd MMMM yyyy', { locale: id })}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Simple date filters for MVP */}
          <Link href="?start=${new Date().toISOString()}&end=${new Date().toISOString()}">
            <Button variant="outline" size="sm">Hari Ini</Button>
          </Link>
          <Link href={`?start=${startOfMonth(new Date()).toISOString()}&end=${endOfMonth(new Date()).toISOString()}`}>
            <Button variant="outline" size="sm">Bulan Ini</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Omset</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp {summary.total_sales.toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jumlah Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.transaction_count}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rata-rata Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              Rp {Math.round(summary.average_transaction).toLocaleString('id-ID')}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(summary.by_payment_method).map(([method, amount]: [string, any]) => (
                <div key={method} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <span className="capitalize font-medium">{method.replace('_', ' ')}</span>
                  <span className="font-bold">Rp {amount.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tren Harian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(summary.by_date).sort().map(([date, amount]: [string, any]) => (
                <div key={date} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <span className="font-medium">{format(parseISO(date), 'dd MMM yyyy', { locale: id })}</span>
                  <span className="font-bold">Rp {amount.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
