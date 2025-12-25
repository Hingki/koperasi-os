
'use client';

import { useState } from 'react';
import { PPOBProduct, purchasePPOB } from '@/lib/actions/member-ppob';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Smartphone, Wifi, Zap, Droplets, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Account } from '../../../lib/types/savings';

export function PPOBForm({ accounts, adminFee, products }: { accounts: Account[]; adminFee: number; products: PPOBProduct[] }) {
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('pulsa');
  const [selectedProduct, setSelectedProduct] = useState<PPOBProduct | null>(null);
  const [customerNumber, setCustomerNumber] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const { toast } = useToast();

  const filteredProducts = products.filter(p => p.category === selectedCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !customerNumber || !selectedAccount) {
      toast({ variant: 'destructive', title: 'Error', description: 'Mohon lengkapi data' });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('productId', selectedProduct.id);
    formData.append('customerNumber', customerNumber);
    formData.append('accountId', selectedAccount);

    const result = await purchasePPOB(formData);
    setLoading(false);

    if (result.success) {
      toast({ 
        title: 'Transaksi Berhasil', 
        description: result.message,
        className: 'bg-emerald-50 border-emerald-200 text-emerald-900'
      });
      setSelectedProduct(null);
      setCustomerNumber('');
    } else {
      toast({ variant: 'destructive', title: 'Gagal', description: result.error });
    }
  };

  const getIcon = (cat: string) => {
    switch (cat) {
      case 'pulsa': return <Smartphone className="w-4 h-4 mr-2" />;
      case 'data': return <Wifi className="w-4 h-4 mr-2" />;
      case 'listrik': return <Zap className="w-4 h-4 mr-2" />;
      case 'pdam': return <Droplets className="w-4 h-4 mr-2" />;
      default: return <Smartphone className="w-4 h-4 mr-2" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Beli & Bayar</CardTitle>
          <CardDescription>Isi ulang pulsa, paket data, token listrik, dan lainnya.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pulsa" onValueChange={setSelectedCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="pulsa">{getIcon('pulsa')} Pulsa</TabsTrigger>
              <TabsTrigger value="data">{getIcon('data')} Data</TabsTrigger>
              <TabsTrigger value="listrik">{getIcon('listrik')} PLN</TabsTrigger>
              <TabsTrigger value="pdam">{getIcon('pdam')} PDAM</TabsTrigger>
            </TabsList>

            <div className="grid gap-6">
              {/* 1. Customer Number */}
              <div className="space-y-2">
                <Label>
                    {selectedCategory === 'listrik' ? 'Nomor Meter / ID Pelanggan' : 'Nomor Handphone'}
                </Label>
                <Input 
                    placeholder={selectedCategory === 'listrik' ? 'Contoh: 140233...' : 'Contoh: 0812345...'} 
                    value={customerNumber}
                    onChange={(e) => setCustomerNumber(e.target.value)}
                    className="text-lg tracking-wide"
                />
              </div>

              {/* 2. Select Product */}
              <div className="space-y-2">
                <Label>Pilih Produk</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredProducts.map((product) => (
                    <div 
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className={`cursor-pointer border rounded-lg p-4 transition-all ${
                        selectedProduct?.id === product.id 
                          ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' 
                          : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-slate-900">{product.name}</span>
                        {selectedProduct?.id === product.id && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                      </div>
                      <div className="text-sm text-slate-500 mb-2">{product.description}</div>
                      <div className="font-bold text-emerald-700">{formatCurrency(product.price)}</div>
                      <div className="text-xs text-slate-500">
                        Biaya Admin: {formatCurrency(adminFee + (product.admin_fee || 0))}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        Total: {formatCurrency(product.price + adminFee + (product.admin_fee || 0))}
                      </div>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && (
                     <div className="col-span-2 text-center py-8 text-slate-500 border border-dashed rounded-lg">
                        Produk belum tersedia untuk kategori ini.
                     </div>
                  )}
                </div>
              </div>

              {/* 3. Payment Source */}
              {selectedProduct && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label>Bayar Pakai</Label>
                    <Select onValueChange={setSelectedAccount} value={selectedAccount}>
                        <SelectTrigger>
                            <SelectValue placeholder="Pilih rekening sumber dana" />
                        </SelectTrigger>
                        <SelectContent>
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id} disabled={acc.balance < (selectedProduct?.price || 0)}>
                                    <span className="flex justify-between w-full gap-4">
                                        <span>{acc.product?.name} ({acc.account_number})</span>
                                        <span className="font-mono text-slate-500">{formatCurrency(acc.balance)}</span>
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">Saldo akan dipotong secara otomatis.</p>
                  </div>
              )}

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 mt-4"
                disabled={loading || !selectedProduct || !customerNumber || !selectedAccount}
                size="lg"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {loading ? 'Memproses...' : `Bayar Sekarang • ${selectedProduct ? formatCurrency(selectedProduct.price + adminFee + (selectedProduct.admin_fee || 0)) : 'Rp 0'}`}
              </Button>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
