'use client';

import { useState } from 'react';
import { ProductGrid } from './product-grid';
import { CartSummary } from './cart-summary';
import { CheckoutDialog } from './checkout-dialog';
import { InventoryProduct } from '@/lib/services/retail-service';

export interface CartItem extends InventoryProduct {
    qty: number;
}

export function PosLayout({ koperasiId, initialProducts }: { koperasiId: string, initialProducts: any[] }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null); // Member or RetailCustomer
    const [customerType, setCustomerType] = useState<'member' | 'retail' | 'guest'>('guest');
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    const addToCart = (product: InventoryProduct) => {
        setCart(prev => {
            const existing = prev.find(p => p.id === product.id);
            if (existing) {
                // Check stock limit
                if (existing.qty >= product.stock_quantity) {
                    alert('Stok tidak mencukupi');
                    return prev;
                }
                return prev.map(p => p.id === product.id ? { ...p, qty: p.qty + 1 } : p);
            }
            if (product.stock_quantity <= 0) {
                alert('Stok habis');
                return prev;
            }
            return [...prev, { ...product, qty: 1 }];
        });
    };

    const updateQty = (productId: string, qty: number) => {
        if (qty <= 0) {
            removeFromCart(productId);
            return;
        }
        
        setCart(prev => {
            const item = prev.find(p => p.id === productId);
            if (item && qty > item.stock_quantity) {
                alert('Stok tidak mencukupi');
                return prev;
            }
            return prev.map(p => p.id === productId ? { ...p, qty } : p);
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(p => p.id !== productId));
    };

    const clearCart = () => {
        setCart([]);
        setSelectedCustomer(null);
        setCustomerType('guest');
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-4">
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 rounded-xl border overflow-hidden">
                 <ProductGrid 
                    koperasiId={koperasiId} 
                    initialProducts={initialProducts} 
                    onAddToCart={addToCart} 
                 />
            </div>
            <div className="w-[400px] flex flex-col bg-white rounded-xl border shadow-sm overflow-hidden">
                <CartSummary 
                    cart={cart}
                    onUpdateQty={updateQty}
                    onRemove={removeFromCart}
                    onClear={clearCart}
                    onCheckout={() => setIsCheckoutOpen(true)}
                    koperasiId={koperasiId}
                    selectedCustomer={selectedCustomer}
                    setSelectedCustomer={setSelectedCustomer}
                    customerType={customerType}
                    setCustomerType={setCustomerType}
                />
            </div>
            
            <CheckoutDialog 
                open={isCheckoutOpen} 
                onOpenChange={setIsCheckoutOpen}
                cart={cart}
                customer={selectedCustomer}
                customerType={customerType}
                koperasiId={koperasiId}
                onSuccess={clearCart}
            />
        </div>
    );
}
