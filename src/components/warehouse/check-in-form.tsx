'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Scale } from 'lucide-react';
import { createPurchase } from '@/lib/actions/retail'; // Reuse existing action
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';

export function CheckInForm({ suppliers, products }: { suppliers: any[], products: any[] }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState(`IN-${Date.now()}`);

  const addItem = () => {
    setItems([...items, { product_id: '', quantity: 0, cost: 0 }]);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto fill cost if product selected
    if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        if (product) {
            newItems[index].cost = product.price_cost;
        }
    }
    setItems(newItems);
  };

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.cost)), 0);

  async function handleSubmit() {
    if (!supplierId || items.length === 0) return;
    setLoading(true);
    
    try {
        const formData = new FormData();
        formData.append('supplier_id', supplierId);
        formData.append('invoice_number', invoiceNumber);
        formData.append('payment_status', 'debt'); // Default to debt/AP
        formData.append('items', JSON.stringify(items.map(item => ({
            product_id: item.product_id,
            quantity: Number(item.quantity),
            cost_per_item: Number(item.cost)
        }))));

        await createPurchase(formData); // Note: Need to verify createPurchase in retail.ts accepts FormData or if I need to adjust.
        // Wait, retail.ts createPurchase likely takes objects if it's not a server action directly bound to form.
        // Let's check retail.ts again.
        
        router.push('/dashboard/warehouse');
    } catch (error: any) {
        alert(error.message);
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nomor Bukti Masuk / Invoice</Label>
              <Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Supplier / Petani</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
              >
                <option value="">Pilih Supplier...</option>
                {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Item Penimbangan</h3>
                <Button onClick={addItem} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" /> Tambah Item
                </Button>
            </div>
            
            <div className="space-y-4">
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-end border-b pb-4">
                        <div className="col-span-4 space-y-2">
                            <Label>Produk</Label>
                            <select 
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={item.product_id}
                                onChange={e => updateItem(index, 'product_id', e.target.value)}
                            >
                                <option value="">Pilih Produk...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-3 space-y-2">
                            <Label className="flex items-center gap-1">
                                <Scale className="h-3 w-3" /> Berat / Qty
                            </Label>
                            <Input 
                                type="number" 
                                step="0.01" 
                                value={item.quantity} 
                                onChange={e => updateItem(index, 'quantity', e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="col-span-3 space-y-2">
                            <Label>Harga Satuan (Beli)</Label>
                            <Input 
                                type="number" 
                                value={item.cost} 
                                onChange={e => updateItem(index, 'cost', e.target.value)}
                            />
                        </div>
                        <div className="col-span-1">
                            <Button variant="ghost" size="icon" onClick={() => removeItem(index)} className="text-red-500">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="col-span-12 text-right text-sm text-muted-foreground">
                            Subtotal: {formatCurrency(Number(item.quantity) * Number(item.cost))}
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end pt-4">
                <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Estimasi Pembelian</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>Batal</Button>
        <Button onClick={handleSubmit} disabled={loading || items.length === 0 || !supplierId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Masuk Gudang
        </Button>
      </div>
    </div>
  );
}
