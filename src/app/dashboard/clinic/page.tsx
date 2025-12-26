import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, ShoppingCart, FileBarChart, Stethoscope } from 'lucide-react';

export default function ClinicDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Klinik & Farmasi</h1>
        <p className="text-muted-foreground">Pusat layanan kesehatan dan farmasi koperasi.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/clinic/patients">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pasien</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Data Pasien</div>
              <p className="text-xs text-muted-foreground">
                Kelola pendaftaran dan rekam medis
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/clinic/pos">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Kasir / POS</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Transaksi</div>
              <p className="text-xs text-muted-foreground">
                Layanan medis dan penjualan obat
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/clinic/reports">
          <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Laporan</CardTitle>
              <FileBarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Konsolidasi</div>
              <p className="text-xs text-muted-foreground">
                Ringkasan pendapatan dan stok
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="h-full bg-red-50 border-red-100">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-800">Status Klinik</CardTitle>
              <Stethoscope className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">Buka</div>
              <p className="text-xs text-red-700">
                Siap melayani pasien
              </p>
            </CardContent>
          </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
          <Card>
              <CardHeader>
                  <CardTitle>Aksi Cepat</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                  <Link href="/dashboard/clinic/patients/new" prefetch={false}>
                    <Button className="w-full justify-start" variant="outline">
                        <Users className="mr-2 h-4 w-4" />
                        Daftarkan Pasien Baru
                    </Button>
                  </Link>
                  <Link href="/dashboard/clinic/pos" prefetch={false}>
                    <Button className="w-full justify-start" variant="outline">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Buat Transaksi Baru
                    </Button>
                  </Link>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
