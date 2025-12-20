import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function LoanProductsPage() {
  const supabase = createClient();
  const { data: products, error } = await supabase
    .from('loan_products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return <div>Error loading products</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Loan Products</h1>
            <p className="text-slate-500">Configure loan types and interest rules.</p>
        </div>
        <Link href="/dashboard/loans/products/new">
            <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
            </button>
        </Link>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <table className="w-full caption-bottom text-sm">
            <thead className="bg-slate-50 border-b">
                <tr>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Code</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Name</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Interest</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Tenor (Max)</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Limit</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {products?.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-medium">{product.code}</td>
                        <td className="p-4">{product.name}</td>
                        <td className="p-4">{product.interest_rate}% ({product.interest_type})</td>
                        <td className="p-4">{product.max_tenor_months} mo</td>
                        <td className="p-4">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(product.max_amount)}
                        </td>
                        <td className="p-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${product.is_active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                {product.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </td>
                    </tr>
                ))}
                {products?.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500">No products found.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
