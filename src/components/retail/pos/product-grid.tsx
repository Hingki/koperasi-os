'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, Package } from 'lucide-react';
import { InventoryProduct } from '@/lib/services/retail-service';
import { searchProducts } from '@/app/actions/retail-pos';

export function ProductGrid({ 
    koperasiId, 
    initialProducts, 
    onAddToCart 
}: { 
    koperasiId: string, 
    initialProducts: any[], 
    onAddToCart: (product: InventoryProduct) => void 
}) {
    const [products, setProducts] = useState<InventoryProduct[]>(initialProducts);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (search.trim() === '') {
                setProducts(initialProducts);
                return;
            }
            setLoading(true);
            try {
                const results = await searchProducts(koperasiId, search);
                setProducts(results as any);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [search, koperasiId, initialProducts]);

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b bg-white">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Cari produk (Nama, Barcode, SKU)..." 
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="text-center py-10 text-slate-500">Mencari...</div>
                ) : products.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">Produk tidak ditemukan</div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {products.map(product => (
                            <button
                                key={product.id}
                                onClick={() => onAddToCart(product)}
                                disabled={!product.is_active || product.stock_quantity <= 0}
                                className="flex flex-col items-start p-4 bg-white rounded-lg border hover:border-blue-500 hover:shadow-sm transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="w-full aspect-square bg-slate-100 rounded-md mb-3 flex items-center justify-center text-slate-400">
                                    <Package className="h-8 w-8" />
                                </div>
                                <div className="font-medium text-slate-900 line-clamp-2 h-10 mb-1">
                                    {product.name}
                                </div>
                                <div className="text-xs text-slate-500 mb-2">
                                    Stok: {product.stock_quantity} {product.unit}
                                </div>
                                <div className="font-bold text-blue-600">
                                    Rp {product.price_sell_public.toLocaleString('id-ID')}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
