'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createPurchaseOrderAction } from '@/lib/actions/purchase-order';
import { useRouter } from 'next/navigation';

interface POFormProps {
  suppliers: any[];
  products: any[];
  koperasiId: string;
}

export default function POForm({ suppliers, products, koperasiId }: POFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([{ product_id: '', quantity: 1, cost_per_item: 0 }]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Recalculate total whenever items change
  const calculateTotal = (currentItems: any[]) => {
    const sum = currentItems.reduce((acc, item) => {
      return acc + (Number(item.quantity) * Number(item.cost_per_item));
    }, 0);
    setTotal(sum);
  };

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 1, cost_per_item: 0 }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    calculateTotal(newItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-fill cost if product selected
    if (field === 'product_id') {
       const product = products.find(p => p.id === value);
       if (product) {
         newItems[index].cost_per_item = product.price_cost;
       }
    }
    
    setItems(newItems);
    calculateTotal(newItems);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const supplierId = formData.get('supplier_id') as string;
    const notes = formData.get('notes') as string;

    try {
        await createPurchaseOrderAction({
            koperasi_id: koperasiId,
            supplier_id: supplierId,
            notes: notes,
            items: items.map(item => ({
                product_id: item.product_id,
                quantity: Number(item.quantity),
                cost_per_item: Number(item.cost_per_item)
            }))
        });
        
        router.push('/dashboard/retail/purchase-orders');
    } catch (error) {
        alert('Error creating Purchase Order');
        console.error(error);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
        <Link href="/dashboard/retail/purchase-orders">
          <Button variant="ghost" size="icon" aria-label="Kembali">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Buat Purchase Order (PO)</h1>
          <p className="text-sm text-slate-500">Pesan barang ke supplier untuk stok masa depan</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header Info */}
        <div className="bg-white p-6 rounded-lg border shadow-sm grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label htmlFor="supplier_id" className="text-sm font-medium">Supplier</label>
                <select id="supplier_id" name="supplier_id" required className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                    <option value="">-- Pilih Supplier --</option>
                    {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>
            <div className="space-y-2">
                <label htmlFor="notes" className="text-sm font-medium">Catatan (Opsional)</label>
                <Input id="notes" name="notes" placeholder="Contoh: Dikirim minggu depan" />
            </div>
        </div>

        {/* Items */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
                <h3 className="font-bold text-lg">Daftar Barang</h3>
                <Button type="button" onClick={addItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" /> Tambah Baris
                </Button>
            </div>
            
            <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="flex gap-4 items-end bg-slate-50 p-4 rounded-lg">
                        <div className="flex-1 space-y-2">
                            <label htmlFor={`product-${index}`} className="text-xs font-medium text-slate-500">Produk</label>
                            <select 
                                id={`product-${index}`}
                                value={item.product_id}
                                onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                                required
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                            >
                                <option value="">-- Pilih Produk --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-32 space-y-2">
                            <label htmlFor={`quantity-${index}`} className="text-xs font-medium text-slate-500">Jumlah</label>
                            <Input 
                                id={`quantity-${index}`}
                                type="number" 
                                value={item.quantity}
                                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                min="1"
                                required 
                            />
                        </div>
                        <div className="w-48 space-y-2">
                            <label htmlFor={`cost-${index}`} className="text-xs font-medium text-slate-500">Estimasi Harga (@)</label>
                            <Input 
                                id={`cost-${index}`}
                                type="number" 
                                value={item.cost_per_item}
                                onChange={(e) => updateItem(index, 'cost_per_item', Number(e.target.value))}
                                min="0"
                                required 
                            />
                        </div>
                        <div className="w-48 space-y-2">
                            <label className="text-xs font-medium text-slate-500">Subtotal</label>
                            <div className="h-10 flex items-center px-3 font-medium bg-slate-100 rounded-md text-slate-700">
                                Rp {(item.quantity * item.cost_per_item).toLocaleString('id-ID')}
                            </div>
                        </div>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            aria-label="Hapus baris"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeItem(index)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="border-t pt-4 flex justify-end items-center gap-4">
                <span className="text-slate-500">Total Estimasi:</span>
                <span className="text-2xl font-bold text-slate-900">Rp {total.toLocaleString('id-ID')}</span>
            </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
            <Link href="/dashboard/retail/purchase-orders">
                <Button variant="outline" type="button">Batal</Button>
            </Link>
            <Button type="submit" disabled={loading} className="w-40">
                {loading ? 'Menyimpan...' : 'Buat Order'}
            </Button>
        </div>
      </form>
    </div>
  );
}
