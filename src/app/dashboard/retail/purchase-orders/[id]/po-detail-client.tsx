'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, CheckCircle, Truck, XCircle, PackageCheck } from 'lucide-react';
import Link from 'next/link';
import { receivePurchaseOrderAction } from '@/lib/actions/purchase-order';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PODetailClientProps {
  po: any;
}

export default function PODetailClient({ po }: PODetailClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receivedItems, setReceivedItems] = useState<{ product_id: string; quantity: number }[]>(
    po.items.map((item: any) => ({ product_id: item.product_id, quantity: item.quantity_ordered }))
  );
  const [isReceiveDialogOpen, setIsReceiveDialogOpen] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'draft':
            return <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Draft</span>;
        case 'ordered':
            return <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Ordered</span>;
        case 'received':
            return <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Received</span>;
        case 'cancelled':
            return <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Cancelled</span>;
        default:
            return <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const handleReceiveQuantityChange = (productId: string, qty: number) => {
      setReceivedItems(prev => prev.map(item => 
          item.product_id === productId ? { ...item, quantity: qty } : item
      ));
  };

  const handleReceiveSubmit = async () => {
      if (!invoiceNumber) {
          alert('Mohon isi No. Faktur Supplier');
          return;
      }

      setLoading(true);
      try {
          const res = await receivePurchaseOrderAction(po.id, invoiceNumber, receivedItems);
          if (res.success) {
              setIsReceiveDialogOpen(false);
              router.refresh();
          } else {
              alert('Gagal menerima barang: ' + res.error);
          }
      } catch (error) {
          console.error(error);
          alert('Terjadi kesalahan saat memproses penerimaan barang.');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/retail/purchase-orders">
            <Button variant="ghost" size="icon" aria-label="Kembali">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            </Link>
            <div>
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{po.po_number}</h1>
                    {getStatusBadge(po.status)}
                </div>
                <p className="text-sm text-slate-500">
                    Dibuat pada {new Date(po.created_at).toLocaleDateString('id-ID')}
                </p>
            </div>
        </div>
        
        <div className="flex gap-2">
            {po.status === 'ordered' && (
                <Dialog open={isReceiveDialogOpen} onOpenChange={setIsReceiveDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700">
                            <PackageCheck className="mr-2 h-4 w-4" />
                            Terima Barang
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            <DialogTitle>Terima Barang dari Supplier</DialogTitle>
                            <DialogDescription>
                                Masukkan No. Faktur dan konfirmasi jumlah barang yang diterima.
                                Stok akan bertambah dan tagihan akan dibuat.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label htmlFor="invoice" className="text-right text-sm font-medium">
                                    No. Faktur
                                </label>
                                <Input
                                    id="invoice"
                                    placeholder="Nomor Invoice Supplier"
                                    className="col-span-3"
                                    value={invoiceNumber}
                                    onChange={(e) => setInvoiceNumber(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2">Produk</th>
                                            <th className="text-center py-2 w-20">Order</th>
                                            <th className="text-center py-2 w-24">Diterima</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {po.items.map((item: any) => {
                                            const received = receivedItems.find(r => r.product_id === item.product_id)?.quantity || 0;
                                            return (
                                                <tr key={item.id} className="border-b last:border-0">
                                                    <td className="py-2">{item.product.name}</td>
                                                    <td className="text-center py-2">{item.quantity_ordered}</td>
                                                    <td className="py-2">
                                                        <Input 
                                                            type="number" 
                                                            min="0"
                                                            value={received}
                                                            onChange={(e) => handleReceiveQuantityChange(item.product_id, Number(e.target.value))}
                                                            className="h-8 text-center"
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsReceiveDialogOpen(false)}>Batal</Button>
                            <Button onClick={handleReceiveSubmit} disabled={loading}>
                                {loading ? 'Memproses...' : 'Simpan Penerimaan'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-4 border-b">
                    <h3 className="font-semibold text-slate-900">Rincian Barang</h3>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b font-medium text-slate-500">
                        <tr>
                            <th className="px-6 py-4">Produk</th>
                            <th className="px-6 py-4 text-center">Qty Order</th>
                            <th className="px-6 py-4 text-right">Harga (@)</th>
                            <th className="px-6 py-4 text-right">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {po.items.map((item: any) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    {item.product?.name}
                                    <div className="text-xs text-slate-500">{item.product?.barcode}</div>
                                </td>
                                <td className="px-6 py-4 text-center text-slate-600">
                                    {item.quantity_ordered}
                                </td>
                                <td className="px-6 py-4 text-right text-slate-600">
                                    Rp {item.cost_per_item.toLocaleString('id-ID')}
                                </td>
                                <td className="px-6 py-4 text-right font-medium text-slate-900">
                                    Rp {item.subtotal.toLocaleString('id-ID')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t font-bold text-slate-900">
                        <tr>
                            <td colSpan={3} className="px-6 py-4 text-right">Total Estimasi</td>
                            <td className="px-6 py-4 text-right">
                                Rp {po.total_amount.toLocaleString('id-ID')}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-900 border-b pb-2">Informasi Supplier</h3>
                <div>
                    <div className="text-sm font-medium text-slate-900">{po.supplier?.name}</div>
                    <div className="text-sm text-slate-500">{po.supplier?.address || '-'}</div>
                    <div className="text-sm text-slate-500">{po.supplier?.contact_person} ({po.supplier?.phone})</div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
                <h3 className="font-semibold text-slate-900 border-b pb-2">Catatan</h3>
                <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {po.notes || '-'}
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
