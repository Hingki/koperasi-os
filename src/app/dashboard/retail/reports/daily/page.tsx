import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default async function DailyReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  const report = isValidUUID 
    ? await retailService.getDailyReport(koperasiId) 
    : { totalSales: 0, totalPurchases: 0, transactionCount: 0, sales: [], purchases: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Laporan Harian</h1>
        <p className="text-sm text-slate-500">
          Ringkasan transaksi hari ini, {format(new Date(), 'dd MMMM yyyy', { locale: id })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              Rp {report.totalSales.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">
              {report.transactionCount} transaksi berhasil
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pembelian</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              Rp {report.totalPurchases.toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">
              Pengeluaran stok hari ini
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${report.totalSales - report.totalPurchases >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              Rp {(report.totalSales - report.totalPurchases).toLocaleString('id-ID')}
            </div>
            <p className="text-xs text-muted-foreground">
              Selisih penjualan dan pembelian
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transaksi Penjualan Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {report.sales && report.sales.length > 0 ? (
              <div className="space-y-4">
                {report.sales.slice(0, 5).map((sale: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">Penjualan #{idx + 1}</p>
                      <p className="text-xs text-slate-500 capitalize">{sale.payment_method}</p>
                    </div>
                    <div className="font-bold text-sm">
                      Rp {sale.final_amount.toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
                {report.sales.length > 5 && (
                  <p className="text-xs text-center text-slate-500">dan {report.sales.length - 5} lainnya...</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Belum ada penjualan hari ini.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaksi Pembelian Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {report.purchases && report.purchases.length > 0 ? (
              <div className="space-y-4">
                {report.purchases.slice(0, 5).map((purchase: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-sm">Pembelian #{idx + 1}</p>
                      <p className="text-xs text-slate-500 capitalize">{purchase.payment_status === 'paid' ? 'Lunas' : 'Hutang'}</p>
                    </div>
                    <div className="font-bold text-sm">
                      Rp {purchase.total_amount.toLocaleString('id-ID')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Belum ada pembelian hari ini.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
