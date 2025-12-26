import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar, FileText, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default async function PurchasesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const koperasiId = user.user_metadata.koperasi_id;
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  // Fetch Purchases (Naive query for now, ideally paginated)
  const { data: purchases } = isValidUUID ? await supabase
    .from('inventory_purchases')
    .select(`
        *,
        supplier:inventory_suppliers(name),
        items:inventory_purchase_items(count),
        po:inventory_purchase_orders(po_number)
    `)
    .eq('koperasi_id', koperasiId)
    .order('purchase_date', { ascending: false }) : { data: [] };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/retail">
                <Button variant="ghost" size="icon">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pembelian (Stok Masuk)</h1>
                <p className="text-sm text-slate-500">
                    Riwayat belanja barang dari supplier
                </p>
            </div>
        </div>
        <Link href="/dashboard/retail/purchases/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Input Pembelian Baru
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            aria-label="Cari No. Faktur"
            placeholder="Cari No. Faktur..." 
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b font-medium text-slate-500">
                <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">No. Faktur</th>
                    <th className="px-6 py-4">Supplier</th>
                    <th className="px-6 py-4 text-center">Jml Item</th>
                    <th className="px-6 py-4 text-right">Total Belanja</th>
                    <th className="px-6 py-4 text-center">Status Bayar</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {(!purchases || purchases.length === 0) ? (
                    <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                            Belum ada riwayat pembelian.
                        </td>
                    </tr>
                ) : (
                    purchases.map((p: any) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-slate-600">
                                {new Date(p.purchase_date).toLocaleDateString('id-ID')}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900">
                                {p.invoice_number || '-'}
                                {p.po && (
                                    <div className="text-xs text-red-600 mt-1">
                                        PO: {p.po.po_number}
                                    </div>
                                )}
                            </td>
                            <td className="px-6 py-4 text-slate-900">
                                {p.supplier?.name || 'Umum'}
                            </td>
                            <td className="px-6 py-4 text-center text-slate-600">
                                {p.items?.[0]?.count || 0}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-900">
                                Rp {p.total_amount.toLocaleString('id-ID')}
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                    p.payment_status === 'paid' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                }`}>
                                    {p.payment_status === 'paid' ? 'Lunas' : 'Hutang'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                </Button>
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
