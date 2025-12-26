import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Search, FileText, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default async function PurchaseOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const koperasiId = user.user_metadata.koperasi_id;
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  const { data: purchaseOrders } = isValidUUID ? await supabase
    .from('inventory_purchase_orders')
    .select(`
        *,
        supplier:inventory_suppliers(name),
        items:inventory_purchase_order_items(count)
    `)
    .eq('koperasi_id', koperasiId)
    .order('created_at', { ascending: false }) : { data: [] };

  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'draft':
            return <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Draft</span>;
        case 'ordered':
            return <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Ordered</span>;
        case 'received':
            return <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Received</span>;
        case 'cancelled':
            return <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Cancelled</span>;
        default:
            return <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

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
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Purchase Orders (PO)</h1>
                <p className="text-sm text-slate-500">
                    Kelola pesanan pembelian barang ke supplier
                </p>
            </div>
        </div>
        <Link href="/dashboard/retail/purchase-orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Buat PO Baru
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            aria-label="Cari No. PO"
            placeholder="Cari No. PO..." 
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b font-medium text-slate-500">
                <tr>
                    <th className="px-6 py-4">Tanggal Order</th>
                    <th className="px-6 py-4">No. PO</th>
                    <th className="px-6 py-4">Supplier</th>
                    <th className="px-6 py-4 text-center">Jml Item</th>
                    <th className="px-6 py-4 text-right">Total Estimasi</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {(!purchaseOrders || purchaseOrders.length === 0) ? (
                    <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                            Belum ada purchase order.
                        </td>
                    </tr>
                ) : (
                    purchaseOrders.map((po: any) => (
                        <tr key={po.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-slate-600">
                                {new Date(po.order_date).toLocaleDateString('id-ID')}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900">
                                {po.po_number}
                            </td>
                            <td className="px-6 py-4 text-slate-900">
                                {po.supplier?.name || '-'}
                            </td>
                            <td className="px-6 py-4 text-center text-slate-600">
                                {po.items?.[0]?.count || 0}
                            </td>
                            <td className="px-6 py-4 text-right font-medium text-slate-900">
                                Rp {po.total_amount.toLocaleString('id-ID')}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {getStatusBadge(po.status)}
                            </td>
                            <td className="px-6 py-4 text-right">
                                <Link href={`/dashboard/retail/purchase-orders/${po.id}`}>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <FileText className="h-4 w-4 text-slate-400" />
                                    </Button>
                                </Link>
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
