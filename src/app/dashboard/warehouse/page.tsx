import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Package, Truck, Scale, ClipboardList } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default async function WarehouseDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  
  // Reuse retail stats for now, can be specialized later
  const products = await retailService.getProducts(koperasiId);
  const totalItems = products.length;
  const lowStock = products.filter(p => p.stock_quantity <= p.min_stock_alert).length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock_quantity * p.price_cost), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gudang & Logistik</h1>
        <p className="text-muted-foreground">Manajemen stok, barang masuk, dan pengiriman.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai Stok</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              {totalItems} SKU Produk
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStock}</div>
            <p className="text-xs text-muted-foreground">
              Perlu restock segera
            </p>
          </CardContent>
        </Card>
        {/* Placeholder for future specific warehouse metrics */}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
          <Card className="col-span-1">
              <CardHeader>
                  <CardTitle>Operasional Gudang</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                  <Link href="/dashboard/warehouse/check-in" prefetch={false}>
                    <Button className="w-full justify-start" variant="outline">
                        <Scale className="mr-2 h-4 w-4" />
                        Penerimaan & Penimbangan
                    </Button>
                  </Link>
                  <Link href="/dashboard/retail/stock-opname" prefetch={false}>
                    <Button className="w-full justify-start" variant="outline">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Stock Opname
                    </Button>
                  </Link>
                   <Link href="/dashboard/warehouse/delivery" prefetch={false}>
                    <Button className="w-full justify-start" variant="outline">
                        <Truck className="mr-2 h-4 w-4" />
                        Delivery Order
                    </Button>
                  </Link>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
