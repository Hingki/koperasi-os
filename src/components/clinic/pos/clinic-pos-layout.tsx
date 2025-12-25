'use client';

import { useState } from 'react';
import { ProductGrid } from '@/components/retail/pos/product-grid';
import { ClinicCartSummary } from './clinic-cart-summary';
import { ClinicCheckoutDialog } from './clinic-checkout-dialog';
import { InventoryProduct } from '@/lib/services/retail-service';

export interface CartItem extends InventoryProduct {
    qty: number;
}

export function ClinicPosLayout({ koperasiId, initialProducts }: { koperasiId: string, initialProducts: InventoryProduct[] }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null); 
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    const addToCart = (product: InventoryProduct) => {
        setCart(prev => {
            const existing = prev.find(p => p.id === product.id);
            if (existing) {
                if (existing.qty >= product.stock_quantity) {
                    // Optional: Toast warning
                    return prev;
                }
                return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
            }
            if (product.stock_quantity <= 0) {
                return prev;
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const updateQty = (id: string, qty: number) => {
        if (qty < 1) {
            setCart(prev => prev.filter(p => p.id !== id));
            return;
        }
        setCart(prev => {
             const item = prev.find(p => p.id === id);
             if (item && qty > item.stock_quantity) {
                 return prev;
             }
             return prev.map(p => p.id === id ? { ...p, qty } : p);
        });
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(p => p.id !== id));
    };

    const clearCart = () => {
        setCart([]);
        setSelectedPatient(null);
    };

    return (
        <div className="flex h-[calc(100vh-4rem)] gap-4 p-4">
            <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b bg-slate-50">
                    <h2 className="font-semibold text-lg text-slate-800">Daftar Layanan & Obat</h2>
                </div>
                <div className="flex-1 overflow-hidden">
                    <ProductGrid 
                        koperasiId={koperasiId}
                        initialProducts={initialProducts} 
                        onAddToCart={addToCart} 
                    />
                </div>
            </div>
            
            <div className="w-[400px]">
                <ClinicCartSummary
                    cart={cart}
                    onUpdateQty={updateQty}
                    onRemove={removeFromCart}
                    onClear={clearCart}
                    onCheckout={() => setIsCheckoutOpen(true)}
                    selectedPatient={selectedPatient}
                    setSelectedPatient={setSelectedPatient}
                />
            </div>

            <ClinicCheckoutDialog 
                open={isCheckoutOpen} 
                onOpenChange={setIsCheckoutOpen}
                cart={cart}
                patient={selectedPatient}
                koperasiId={koperasiId}
                onSuccess={clearCart}
            />
        </div>
    );
}
