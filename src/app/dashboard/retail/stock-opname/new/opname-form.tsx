'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { InventoryProduct } from '@/lib/services/retail-service';
import { createStockOpnameAction } from '@/lib/actions/retail';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface OpnameFormProps {
  products: InventoryProduct[];
  koperasiId: string;
}

export function OpnameForm({ products, koperasiId }: OpnameFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(
    products.map(p => ({
      product_id: p.id,
      product_name: p.name,
      system_qty: p.stock_quantity,
      actual_qty: p.stock_quantity, // Default to system qty
      notes: ''
    }))
  );
  const [notes, setNotes] = useState('');

  const handleQtyChange = (index: number, val: string) => {
    const newItems = [...items];
    newItems[index].actual_qty = Number(val);
    setItems(newItems);
  };

  const handleNotesChange = (index: number, val: string) => {
    const newItems = [...items];
    newItems[index].notes = val;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Filter items that have differences or just submit all? 
      // Usually stock opname snapshots everything, or at least checked items.
      // For MVP, we submit all to have a full snapshot.
      
      const payload = {
        koperasi_id: koperasiId,
        notes,
        status: 'final' as const, // Direct final for MVP
        items: items.map(i => ({
          product_id: i.product_id,
          system_qty: i.system_qty,
          actual_qty: i.actual_qty,
          notes: i.notes
        }))
      };

      await createStockOpnameAction(payload);
      router.push('/dashboard/retail/stock-opname');
      router.refresh();
    } catch (error) {
      console.error(error);
      alert('Gagal menyimpan stock opname');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium">Catatan Opname</label>
          <Textarea 
            placeholder="Contoh: Opname bulanan Desember 2025" 
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4 w-[40%]">Produk</th>
                <th className="px-6 py-4 text-center w-[15%]">Stok Sistem</th>
                <th className="px-6 py-4 text-center w-[15%]">Fisik</th>
                <th className="px-6 py-4 text-center w-[15%]">Selisih</th>
                <th className="px-6 py-4 w-[15%]">Ket</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const diff = item.actual_qty - item.system_qty;
                return (
                  <tr key={item.product_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium">
                      {item.product_name}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.system_qty}
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        type="number" 
                        value={item.actual_qty}
                        onChange={(e) => handleQtyChange(idx, e.target.value)}
                        className="text-center"
                      />
                    </td>
                    <td className="px-6 py-4 text-center font-bold">
                      <span className={diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : 'text-slate-400'}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Input 
                        placeholder="..." 
                        value={item.notes}
                        onChange={(e) => handleNotesChange(idx, e.target.value)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-4">
        <Button variant="outline" type="button" onClick={() => router.back()}>
          Batal
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Simpan & Update Stok
        </Button>
      </div>
    </form>
  );
}
