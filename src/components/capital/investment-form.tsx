'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { investInCapitalProduct } from '@/lib/actions/capital';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function InvestmentForm({ product }: { product: any }) {
  const [amount, setAmount] = useState<number>(product.min_investment);
  const [method, setMethod] = useState<'savings' | 'transfer'>('transfer');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('product_id', product.id);
    formData.append('amount', amount.toString());
    formData.append('payment_method', method);

    const res = await investInCapitalProduct(formData);
    
    setLoading(false);
    if (res?.error) {
        alert(res.error);
    } else {
        alert('Investasi berhasil!');
        router.push('/dashboard/investments');
        router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 border rounded-lg p-6 bg-slate-50">
        <h3 className="text-lg font-semibold mb-4">Form Penyertaan Modal</h3>
        
        <div className="space-y-2">
            <Label>Jumlah Investasi (Min. {formatCurrency(product.min_investment)})</Label>
            <Input 
                type="number" 
                min={product.min_investment}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
            />
        </div>

        <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <RadioGroup defaultValue="transfer" onValueChange={(v: any) => setMethod(v)}>
                <div className="flex items-center space-x-2 border p-3 rounded bg-white">
                    <RadioGroupItem value="transfer" id="r1" />
                    <Label htmlFor="r1">Transfer Bank (Manual)</Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded bg-white">
                    <RadioGroupItem value="savings" id="r2" />
                    <Label htmlFor="r2">Potong Saldo Simpanan Sukarela</Label>
                </div>
            </RadioGroup>
        </div>

        <div className="pt-4">
            <div className="flex justify-between text-sm mb-4 p-3 bg-red-50 text-red-800 rounded">
                <span>Estimasi Bagi Hasil ({product.profit_share_percent}%)</span>
                <span className="font-bold">Sesuai Kinerja Unit Usaha</span>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Setor Modal
            </Button>
        </div>
    </form>
  );
}
