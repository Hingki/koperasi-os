'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { createPurchaseReturnAction, getPurchaseDetailsAction } from '@/lib/actions/retail';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface ReturnFormProps {
  koperasiId: string;
  purchases: any[];
}

export default function ReturnForm({ koperasiId, purchases }: ReturnFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState('');
  const [purchaseData, setPurchaseData] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [reason, setReason] = useState('');

  const handlePurchaseSelect = async (id: string) => {
    setSelectedPurchaseId(id);
    setLoading(true);
    try {
      const data = await getPurchaseDetailsAction(id);
      setPurchaseData(data);
      // Initialize return items with 0 qty
      if (data?.items) {
        setReturnItems(data.items.map((item: any) => ({
          ...item,
          return_qty: 0
        })));
      }
    } catch (error) {
      console.error(error);
      alert('Gagal mengambil data pembelian');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (itemId: string, qty: number) => {
    setReturnItems(prev => prev.map(item => {
      if (item.id === itemId) {
        // Validate max qty
        const max = item.quantity;
        const validQty = Math.min(Math.max(0, qty), max);
        return { ...item, return_qty: validQty };
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseData) return;

    const itemsToReturn = returnItems.filter(i => i.return_qty > 0);
    if (itemsToReturn.length === 0) {
      alert('Pilih minimal satu barang untuk diretur');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        koperasi_id: koperasiId,
        purchase_id: purchaseData.id,
        supplier_id: purchaseData.supplier_id,
        reason,
        status: 'completed' as const,
        items: itemsToReturn.map(i => ({
          product_id: i.product_id,
          quantity: i.return_qty,
          refund_amount_per_item: i.cost_per_item,
          subtotal: i.return_qty * i.cost_per_item
        }))
      };

      await createPurchaseReturnAction(payload);
      router.push('/dashboard/retail/purchases/returns');
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan retur pembelian');
    } finally {
      setLoading(false);
    }
  };

  const totalRefund = returnItems.reduce((acc, item) => acc + (item.return_qty * item.cost_per_item), 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Pilih Faktur Pembelian</Label>
            <Select value={selectedPurchaseId} onValueChange={handlePurchaseSelect} disabled={loading && !purchaseData}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih nomor invoice..." />
              </SelectTrigger>
              <SelectContent>
                {purchases.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.invoice_number} - {p.supplier?.name} (Rp {p.total_amount.toLocaleString('id-ID')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Alasan Retur</Label>
            <Textarea 
              value={reason} 
              onChange={e => setReason(e.target.value)} 
              placeholder="Contoh: Barang rusak, kadaluarsa, dll."
            />
          </div>
        </CardContent>
      </Card>

      {purchaseData && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-4">Daftar Barang</h3>
            <div className="space-y-4">
              {returnItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{item.product?.name}</p>
                    <p className="text-sm text-slate-500">
                      Dibeli: {item.quantity} {item.product?.unit} @ Rp {item.cost_per_item.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="w-32">
                    <Label className="text-xs mb-1 block">Jml Retur</Label>
                    <Input
                      type="number"
                      min="0"
                      max={item.quantity}
                      value={item.return_qty}
                      onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="w-32 text-right pl-4">
                    <Label className="text-xs mb-1 block">Subtotal Refund</Label>
                    <p className="font-medium">
                      Rp {(item.return_qty * item.cost_per_item).toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-500">Total Refund</p>
                <p className="text-xl font-bold text-green-600">
                  Rp {totalRefund.toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-4">
        <Link href="/dashboard/retail/purchases/returns">
          <Button type="button" variant="outline">Batal</Button>
        </Link>
        <Button type="submit" disabled={loading || !purchaseData || totalRefund === 0}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan Retur
        </Button>
      </div>
    </form>
  );
}
