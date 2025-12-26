import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus, ArrowLeft, Pencil, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeleteProductButton } from '@/components/settings/delete-product-button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';

export default async function FinancingProductsPage() {
  const supabase = await createClient();
  const { data: products, error } = await supabase
    .from('loan_products')
    .select('*')
    .eq('is_financing', true)
    .order('created_at', { ascending: false });

  if (error) return <div>Error loading products</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <Link href="/dashboard/financing" prefetch={false} className="p-2 hover:bg-slate-100 rounded-full">
                <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Produk Pembiayaan</h1>
                <p className="text-slate-500">Kelola skema pembiayaan (leasing, kredit barang).</p>
            </div>
        </div>
        <Link href="/dashboard/financing/products/new" prefetch={false}>
            <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Produk
            </Button>
        </Link>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <table className="w-full caption-bottom text-sm">
            <thead className="bg-slate-50 border-b">
                <tr>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Kode</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Nama Produk</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Kategori</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Bunga</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Limit</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Status</th>
                    <th className="h-12 px-4 text-right font-medium text-slate-500">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {products?.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                        <td className="p-4 font-mono">{product.code}</td>
                        <td className="p-4 font-medium">{product.name}</td>
                        <td className="p-4 capitalize">
                            <Badge variant="outline">{product.financing_category || 'General'}</Badge>
                        </td>
                        <td className="p-4">
                            {product.interest_rate}% ({product.interest_type})
                        </td>
                        <td className="p-4">
                            {formatCurrency(product.min_amount)} - {formatCurrency(product.max_amount)}
                        </td>
                        <td className="p-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                product.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                                {product.is_active ? 'Aktif' : 'Non-Aktif'}
                            </span>
                        </td>
                        <td className="p-4 flex justify-end space-x-2">
                            <Link href={`/dashboard/financing/products/${product.id}/edit`} prefetch={false}>
                                <Button variant="ghost" size="icon">
                                    <Pencil className="w-4 h-4 text-slate-500" />
                                </Button>
                            </Link>
                            <DeleteProductButton id={product.id} />
                        </td>
                    </tr>
                ))}
                {products?.length === 0 && (
                    <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                            <div className="flex flex-col items-center gap-2">
                                <Package className="w-8 h-8 text-slate-300" />
                                <p>Belum ada produk pembiayaan.</p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
