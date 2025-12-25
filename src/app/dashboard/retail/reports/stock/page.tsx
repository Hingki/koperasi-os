import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default async function StockReportPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  const products = isValidUUID 
    ? await retailService.getProducts(koperasiId) 
    : [];

  const regularProducts = products.filter((p: any) => p.product_type === 'regular');
  const consignmentProducts = products.filter((p: any) => p.product_type === 'consignment');

  const totalStockValue = products.reduce((acc: number, p: any) => acc + (p.stock_quantity * p.price_cost), 0);
  const totalRegularValue = regularProducts.reduce((acc: number, p: any) => acc + (p.stock_quantity * p.price_cost), 0);
  const totalConsignmentValue = consignmentProducts.reduce((acc: number, p: any) => acc + (p.stock_quantity * p.price_cost), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Laporan Stok Barang</h1>
        <p className="text-sm text-slate-500">
          Ringkasan persediaan barang reguler dan konsinyasi
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nilai Stok</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalStockValue.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              {products.length} total item
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Reguler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalRegularValue.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              {regularProducts.length} item milik sendiri
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Konsinyasi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalConsignmentValue.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">
              {consignmentProducts.length} item titipan
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="regular" className="space-y-4">
        <TabsList>
          <TabsTrigger value="regular">Barang Reguler</TabsTrigger>
          <TabsTrigger value="consignment">Barang Konsinyasi</TabsTrigger>
        </TabsList>
        
        <TabsContent value="regular" className="space-y-4">
          <ProductTable products={regularProducts} />
        </TabsContent>
        
        <TabsContent value="consignment" className="space-y-4">
          <ProductTable products={consignmentProducts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductTable({ products }: { products: any[] }) {
  return (
    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4">Produk</th>
              <th className="px-6 py-4">Kategori</th>
              <th className="px-6 py-4 text-right">Harga Modal</th>
              <th className="px-6 py-4 text-right">Harga Jual</th>
              <th className="px-6 py-4 text-center">Stok</th>
              <th className="px-6 py-4 text-right">Nilai Aset</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  Tidak ada data stok.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">
                    {product.name}
                    <div className="text-xs text-slate-500">{product.barcode || product.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {product.category?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    Rp {product.price_cost.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    Rp {product.price_sell_public.toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={product.stock_quantity <= (product.min_stock_alert || 5) ? 'destructive' : 'outline'}>
                      {product.stock_quantity} {product.unit}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    Rp {(product.stock_quantity * product.price_cost).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
