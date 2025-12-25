import { createClient } from '@/lib/supabase/server';
import { getPharmacySalesConsolidationAction } from '@/lib/actions/retail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDateRangePicker } from '@/components/date-range-picker';
import { formatCurrency } from '@/lib/utils';
import { subDays } from 'date-fns';

export default async function ClinicReportsPage({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const from = searchParams.from || subDays(new Date(), 30).toISOString();
  const to = searchParams.to || new Date().toISOString();

  const report = await getPharmacySalesConsolidationAction(from, to);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Laporan Konsolidasi Klinik</h1>
          <p className="text-muted-foreground">Ringkasan pendapatan dari layanan medis dan farmasi.</p>
        </div>
        <div className="flex items-center gap-2">
           <CalendarDateRangePicker />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.summary.total_revenue)}</div>
            <p className="text-xs text-muted-foreground">
              {report.summary.transaction_count} Transaksi
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba Kotor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(report.summary.total_profit)}</div>
            <p className="text-xs text-muted-foreground">
              Margin: {((report.summary.total_profit / report.summary.total_revenue) * 100 || 0).toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Pendapatan per Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                {report.by_payment_method.map((item: any) => (
                    <div key={item.method} className="flex items-center">
                        <div className="ml-4 space-y-1">
                            <p className="text-sm font-medium leading-none capitalize">{item.method.replace('_', ' ')}</p>
                            <p className="text-sm text-muted-foreground">{item.count} Transaksi</p>
                        </div>
                        <div className="ml-auto font-medium">{formatCurrency(item.total)}</div>
                    </div>
                ))}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Kategori Layanan</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                {/* Note: This assumes we have category data, currently simulated or grouped */}
                <div className="text-sm text-muted-foreground text-center py-8">
                    Data kategori belum tersedia secara detail.
                </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
