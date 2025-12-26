import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, Package, Edit, Plus } from 'lucide-react';
import SeedProductsButton from '@/components/savings/seed-products-button';

export default async function SavingsProductsPage() {
  const supabase = await createClient();
  
  const { data: products } = await supabase
    .from('savings_products')
    .select('*')
    .order('code', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <Link href="/dashboard/savings" className="p-2 hover:bg-slate-100 rounded-full">
                <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Produk Simpanan</h1>
        </div>
        <div className="flex space-x-2">
            <SeedProductsButton />
            <Link href="/dashboard/savings/products/new">
                <button className="flex items-center px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md text-sm font-medium">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Produk
                </button>
            </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products?.map((product) => (
            <div key={product.id} className="bg-white rounded-lg border shadow-sm p-6 flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 font-mono">
                            {product.code}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            product.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {product.is_active ? 'Aktif' : 'Non-Aktif'}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-1">{product.name}</h3>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">{product.description}</p>
                    
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Suku Bunga</span>
                            <span className="font-medium">{product.interest_rate}% p.a.</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Min. Setoran</span>
                            <span className="font-medium">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(product.min_deposit)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500">Tipe</span>
                            <span className="font-medium capitalize">{product.type}</span>
                        </div>
                    </div>
                </div>
                
                <div className="mt-6 pt-4 border-t flex justify-end">
                    <button className="text-sm font-medium text-red-600 hover:text-red-700 flex items-center">
                        <Edit className="w-4 h-4 mr-1" /> Edit Produk
                    </button>
                </div>
            </div>
        ))}

        {products?.length === 0 && (
            <div className="col-span-full py-12 text-center bg-slate-50 rounded-lg border border-dashed">
                <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">Belum ada produk</h3>
                <p className="text-slate-500">Silakan buat produk default atau tambah produk baru.</p>
            </div>
        )}
      </div>
    </div>
  );
}
