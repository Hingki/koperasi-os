'use client';

import { useState, useMemo } from 'react';
import { InventoryProduct, InventoryCategory } from '@/lib/services/retail-service';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowRight,
  Monitor,
  CheckCircle,
  X
} from 'lucide-react';
import { processPosTransaction } from '@/lib/actions/retail';
import { formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KioskViewProps {
  products: InventoryProduct[];
  categories: InventoryCategory[];
  koperasiId: string;
  unitUsahaId: string;
}

interface CartItem {
  product: InventoryProduct;
  quantity: number;
}

export default function KioskView({ 
  products, 
  categories, 
  koperasiId, 
  unitUsahaId 
}: KioskViewProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState('');
  const { toast } = useToast();

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                            p.barcode?.includes(search);
      const matchesCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  const addToCart = (product: InventoryProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      });
    });
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price_sell_public * item.quantity), 0);
  }, [cart]);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const transactionData = {
        koperasi_id: koperasiId,
        unit_usaha_id: unitUsahaId,
        member_id: undefined,
        customer_name: 'Pelanggan Kiosk',
        total_amount: cartTotal,
        discount_amount: 0,
        tax_amount: 0, // Simplified for now
        final_amount: cartTotal,
        payment_method: 'cash', // Default to cash/pay at cashier
        payment_status: 'pending',
        notes: '[KIOSK] Menunggu pembayaran di kasir',
      };

      const items = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_sale: item.product.price_sell_public,
        cost_at_sale: item.product.price_cost,
        subtotal: item.product.price_sell_public * item.quantity,
      }));

      const result = await processPosTransaction(transactionData, items);

      if (result.success && result.data) {
        setLastOrderNumber((result.data as any).invoice_number || 'UNKNOWN');
        setIsConfirmOpen(false);
        setIsSuccessOpen(true);
        setCart([]);
      } else {
        toast({
          title: "Gagal memproses pesanan",
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Terjadi kesalahan",
        description: "Silakan coba lagi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Monitor className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Self Service Kiosk</h1>
            <p className="text-sm text-slate-500">Silakan pilih barang yang Anda butuhkan</p>
          </div>
        </div>
        <div className="w-1/3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Cari barang..." 
              className="pl-9 bg-slate-100 border-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content - Product Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Categories */}
          <div className="p-4 border-b bg-white shrink-0 overflow-x-auto">
            <div className="flex gap-2">
              <Button 
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className="rounded-full"
              >
                Semua
              </Button>
              {categories.map(cat => (
                <Button 
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="rounded-full"
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
              {filteredProducts.map(product => (
                <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow border-none shadow-sm flex flex-col h-full">
                  <div className="aspect-square bg-slate-100 relative group">
                    {/* Placeholder image logic or real image if available */}
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                      <Monitor className="h-12 w-12" />
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button onClick={() => addToCart(product)} size="lg" className="rounded-full">
                        <Plus className="mr-2 h-5 w-5" /> Tambah
                      </Button>
                    </div>
                  </div>
                  <CardContent className="p-4 flex-1 flex flex-col">
                    <h3 className="font-semibold text-lg line-clamp-2 mb-2">{product.name}</h3>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-primary font-bold text-lg">
                        {formatCurrency(product.price_sell_public)}
                      </span>
                      {product.stock_quantity <= 0 && (
                        <Badge variant="destructive">Stok Habis</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Sidebar - Cart */}
        <div className="w-[400px] bg-white border-l flex flex-col shadow-xl z-10">
          <div className="p-6 border-b bg-slate-50">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Keranjang Belanja
            </h2>
          </div>

          <ScrollArea className="flex-1 p-6">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <ShoppingCart className="h-16 w-16 opacity-20" />
                <p>Keranjang masih kosong</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.product.id} className="flex gap-4 p-4 rounded-xl border bg-white shadow-sm">
                    <div className="h-16 w-16 bg-slate-100 rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{item.product.name}</h4>
                      <div className="text-primary font-bold mt-1">
                        {formatCurrency(item.product.price_sell_public * item.quantity)}
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(item.product.id, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 rounded-full"
                          onClick={() => updateQuantity(item.product.id, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-6 bg-slate-50 border-t space-y-4">
            <div className="flex items-center justify-between text-lg">
              <span className="text-slate-600">Total Pembayaran</span>
              <span className="font-bold text-2xl">{formatCurrency(cartTotal)}</span>
            </div>
            <Button 
              className="w-full h-14 text-lg rounded-xl shadow-lg shadow-primary/20" 
              disabled={cart.length === 0}
              onClick={() => setIsConfirmOpen(true)}
            >
              Proses Pesanan
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pesanan</DialogTitle>
            <DialogDescription>
              Pesanan akan dibuat dan Anda dapat melakukan pembayaran di kasir.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
             <div className="flex justify-between font-medium">
               <span>Jumlah Item</span>
               <span>{cart.reduce((a, b) => a + b.quantity, 0)} items</span>
             </div>
             <div className="flex justify-between font-bold text-lg">
               <span>Total Tagihan</span>
               <span>{formatCurrency(cartTotal)}</span>
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Batal</Button>
            <Button onClick={handleCheckout} disabled={loading}>
              {loading ? "Memproses..." : "Ya, Pesan Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-2xl">Pesanan Berhasil!</DialogTitle>
            <div className="text-slate-500">
              <p>Nomor Pesanan Anda:</p>
              <p className="text-3xl font-bold text-slate-900 my-2">{lastOrderNumber}</p>
              <p>Silakan menuju kasir untuk melakukan pembayaran.</p>
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button size="lg" className="w-full" onClick={() => setIsSuccessOpen(false)}>
              Buat Pesanan Baru
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
