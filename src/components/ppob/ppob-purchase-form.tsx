'use client'

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';
import { purchasePpobProduct } from '@/lib/actions/ppob';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PpobProduct {
  id: string;
  code: string;
  name: string;
  price_sell: number;
  provider: string;
  description: string;
}

interface SavingsAccount {
  id: string;
  account_number: string;
  balance: number;
  product: {
    name: string;
  };
}

interface PpobPurchaseFormProps {
  category: string;
  products: PpobProduct[];
  accounts: SavingsAccount[];
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Memproses Transaksi...
        </>
      ) : (
        'Bayar Sekarang'
      )}
    </Button>
  );
}

export function PpobPurchaseForm({ category, products, accounts }: PpobPurchaseFormProps) {
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [customerNumber, setCustomerNumber] = useState<string>('');
  const router = useRouter();

  const product = products.find(p => p.code === selectedProduct);
  const activeAccounts = accounts.filter(a => a.balance > (product?.price_sell || 0));

  async function clientAction(formData: FormData) {
    const result = await purchasePpobProduct(formData);
    
    if (result?.error) {
      toast.error('Transaksi Gagal', { description: result.error });
    } else {
      toast.success('Transaksi Berhasil', { description: 'Pembelian anda sedang diproses.' });
      router.push('/member/ppob');
    }
  }

  // Group products by provider
  const productsByProvider = products.reduce((acc, curr) => {
    if (!acc[curr.provider]) acc[curr.provider] = [];
    acc[curr.provider].push(curr);
    return acc;
  }, {} as Record<string, PpobProduct[]>);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Left: Form */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">Beli {category}</CardTitle>
          <CardDescription>Masukkan nomor tujuan dan pilih produk.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={clientAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="customerNumber">Nomor Tujuan / ID Pelanggan</Label>
              <Input
                id="customerNumber"
                name="customerNumber"
                placeholder="Contoh: 08123456789"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Pilih Produk</Label>
              <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-2">
                {Object.entries(productsByProvider).map(([provider, items]) => (
                  <div key={provider} className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-500 sticky top-0 bg-white py-1">{provider}</h4>
                    {items.map((p) => (
                      <div
                        key={p.code}
                        onClick={() => setSelectedProduct(p.code)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedProduct === p.code
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                            : 'border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-sm">{p.name}</span>
                          <span className="font-bold text-blue-700">{formatCurrency(p.price_sell)}</span>
                        </div>
                        {p.description && <p className="text-xs text-slate-500 mt-1">{p.description}</p>}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <input type="hidden" name="productCode" value={selectedProduct} />
            </div>

            {selectedProduct && (
              <div className="space-y-2">
                <Label htmlFor="accountId">Sumber Dana</Label>
                <Select name="accountId" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih rekening simpanan" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem 
                        key={acc.id} 
                        value={acc.id}
                        disabled={product ? acc.balance < product.price_sell : false}
                      >
                        {acc.product.name} - {acc.account_number} ({formatCurrency(acc.balance)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeAccounts.length === 0 && (
                  <p className="text-xs text-red-500">Saldo tidak mencukupi di semua rekening.</p>
                )}
              </div>
            )}

            <SubmitButton />
          </form>
        </CardContent>
      </Card>

      {/* Right: Summary / Info */}
      <div className="space-y-6">
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Informasi Produk</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
             <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <p>Transaksi diproses secara otomatis 24/7.</p>
             </div>
             <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                <p>Pastikan nomor tujuan benar. Kesalahan nomor tujuan tidak dapat dibatalkan.</p>
             </div>
             <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                <p>Jika transaksi gagal, dana akan otomatis dikembalikan ke saldo simpanan anda.</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
