import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default async function RetailProductsPage({ searchParams }: { searchParams?: { type?: 'regular' | 'consignment' } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  
  // Safe check if koperasiId exists and is valid UUID
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  const products = isValidUUID 
    ? await retailService.getProducts(koperasiId, { type: searchParams?.type })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Produk</h1>
          <p className="text-sm text-slate-500">
            Daftar barang dagangan dan stok
          </p>
        </div>
        <Link href="/dashboard/retail/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Produk
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            aria-label="Cari produk"
            placeholder="Cari nama produk, barcode, atau SKU..." 
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/retail/products">
            <Button variant={!searchParams?.type ? 'default' : 'outline'} size="sm">
              Semua
            </Button>
          </Link>
          <Link href="/dashboard/retail/products?type=regular">
            <Button variant={searchParams?.type === 'regular' ? 'default' : 'outline'} size="sm">
              Barang Reguler
            </Button>
          </Link>
          <Link href="/dashboard/retail/products?type=consignment">
            <Button variant={searchParams?.type === 'consignment' ? 'default' : 'outline'} size="sm">
              Barang Konsinyasi
            </Button>
          </Link>
          <Button variant="outline" size="icon" aria-label="Filter lainnya">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Nama Produk</th>
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4 text-right">Harga Jual (Umum)</th>
                <th className="px-6 py-4 text-right">Harga Jual (Anggota)</th>
                <th className="px-6 py-4 text-center">Stok</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Belum ada produk. Silakan tambah produk baru.
                  </td>
                </tr>
              ) : (
                products.map((product: any) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{product.name}</div>
                      <div className="text-xs text-slate-500">{product.barcode || product.sku || '-'}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {product.category?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      Rp {product.price_sell_public.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-blue-600">
                      Rp {product.price_sell_member.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        product.stock_quantity <= (product.min_stock_alert || 5)
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.stock_quantity} {product.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex h-2 w-2 rounded-full ${product.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        href={`/dashboard/retail/products/${product.id}/edit`}
                        className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
