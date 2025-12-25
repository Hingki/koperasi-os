'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createStockOpnameAction } from '@/lib/actions/retail';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function StockOpnameForm({ products }: { products: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState(
    products.map(p => ({
        product_id: p.id,
        name: p.name,
        system_qty: p.stock_quantity,
        actual_qty: p.stock_quantity,
        notes: ''
    }))
  );
  const [notes, setNotes] = useState('');

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  async function handleSubmit(status: 'draft' | 'final') {
    setLoading(true);
    try {
        await createStockOpnameAction({
            notes,
            status,
            items: items.map(i => ({
                product_id: i.product_id,
                system_qty: i.system_qty,
                actual_qty: Number(i.actual_qty),
                notes: i.notes
            }))
        });
        router.push('/dashboard/retail/stock-opname');
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
            <div className="space-y-2">
                <label className="text-sm font-medium">Catatan Stock Opname</label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contoh: SO Bulan Desember 2025" />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Nama Produk</TableHead>
                        <TableHead className="w-[100px]">Stok Sistem</TableHead>
                        <TableHead className="w-[100px]">Stok Fisik</TableHead>
                        <TableHead className="w-[100px]">Selisih</TableHead>
                        <TableHead>Keterangan</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item, index) => {
                        const diff = Number(item.actual_qty) - item.system_qty;
                        return (
                            <TableRow key={item.product_id}>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.system_qty}</TableCell>
                                <TableCell>
                                    <Input 
                                        type="number" 
                                        value={item.actual_qty} 
                                        onChange={e => updateItem(index, 'actual_qty', e.target.value)}
                                        className="w-24"
                                    />
                                </TableCell>
                                <TableCell className={diff !== 0 ? (diff < 0 ? 'text-red-500' : 'text-green-500') : ''}>
                                    {diff > 0 ? '+' : ''}{diff}
                                </TableCell>
                                <TableCell>
                                    <Input 
                                        value={item.notes} 
                                        onChange={e => updateItem(index, 'notes', e.target.value)}
                                        placeholder="Alasan selisih..."
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>Batal</Button>
        <Button variant="secondary" onClick={() => handleSubmit('draft')} disabled={loading}>
             Simpan Draft
        </Button>
        <Button onClick={() => handleSubmit('final')} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Finalisasi Stok
        </Button>
      </div>
    </div>
  );
}
