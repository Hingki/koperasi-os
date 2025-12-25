import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, ShoppingBag, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Kiosk Self Service | Koperasi OS',
  description: 'Aktifkan mode kiosk untuk pelanggan',
};

export default function KioskPage() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Kiosk Self Service</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Mode Kiosk
            </CardTitle>
            <CardDescription>
              Buka tampilan Self Service untuk pelanggan memilih barang sendiri.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/kiosk" target="_blank">
              <Button className="w-full h-24 text-lg" variant="outline">
                <ExternalLink className="mr-2 h-6 w-6" />
                Buka Layar Kiosk
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Pesanan Kiosk
            </CardTitle>
            <CardDescription>
              Lihat dan proses pesanan yang masuk dari Kiosk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/retail/kiosk/orders">
              <Button className="w-full h-24 text-lg">
                Lihat Pesanan Masuk
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
