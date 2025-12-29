'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Plus, Minus, Check } from 'lucide-react';
import { CartItem } from './pos-layout';
import { searchMembers, searchRetailCustomers } from '@/app/actions/retail-pos';
import { ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function CartSummary({
    cart,
    onUpdateQty,
    onRemove,
    onClear,
    onCheckout,
    koperasiId,
    selectedCustomer,
    setSelectedCustomer,
    customerType,
    setCustomerType
}: {
    cart: CartItem[],
    onUpdateQty: (id: string, qty: number) => void,
    onRemove: (id: string) => void,
    onClear: () => void,
    onCheckout: () => void,
    koperasiId: string,
    selectedCustomer: any,
    setSelectedCustomer: (c: any) => void,
    customerType: 'member' | 'retail' | 'guest',
    setCustomerType: (t: 'member' | 'retail' | 'guest') => void
}) {
    const total = cart.reduce((sum, item) => sum + (item.price_sell_public * item.qty), 0);
    const [openCustomerSearch, setOpenCustomerSearch] = useState(false);
    const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearchCustomer = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) return;

        try {
            if (customerType === 'member') {
                const results = await searchMembers(koperasiId, query);
                setCustomerSearchResults(results || []);
            } else if (customerType === 'retail') {
                const results = await searchRetailCustomers(koperasiId, query);
                setCustomerSearchResults(results || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b space-y-3">
                <div className="flex rounded-md shadow-sm">
                    <button
                        onClick={() => { setCustomerType('guest'); setSelectedCustomer(null); }}
                        className={`flex-1 px-3 py-2 text-sm font-medium border rounded-l-md ${customerType === 'guest' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                        Umum
                    </button>
                    <button
                        onClick={() => { setCustomerType('member'); setSelectedCustomer(null); }}
                        className={`flex-1 px-3 py-2 text-sm font-medium border-t border-b ${customerType === 'member' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                        Anggota
                    </button>
                    <button
                        onClick={() => { setCustomerType('retail'); setSelectedCustomer(null); }}
                        className={`flex-1 px-3 py-2 text-sm font-medium border rounded-r-md ${customerType === 'retail' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}
                    >
                        Pelanggan
                    </button>
                </div>

                {customerType !== 'guest' && (
                    <Popover open={openCustomerSearch} onOpenChange={setOpenCustomerSearch}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCustomerSearch}
                                className="w-full justify-between"
                            >
                                {selectedCustomer
                                    ? selectedCustomer.name
                                    : `Cari ${customerType === 'member' ? 'Anggota' : 'Pelanggan'}...`}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[350px] p-2" align="start">
                            <Input
                                placeholder={`Cari nama ${customerType === 'member' ? 'anggota' : 'pelanggan'}...`}
                                value={searchQuery}
                                onChange={(e) => handleSearchCustomer(e.target.value)}
                                className="mb-2"
                            />
                            <div className="max-h-[200px] overflow-y-auto space-y-1">
                                {customerSearchResults.length === 0 ? (
                                    <div className="text-sm text-slate-500 text-center py-2">Tidak ditemukan</div>
                                ) : (
                                    customerSearchResults.map((customer) => (
                                        <button
                                            key={customer.id}
                                            onClick={() => {
                                                setSelectedCustomer(customer);
                                                setOpenCustomerSearch(false);
                                                setSearchQuery('');
                                            }}
                                            className="w-full flex items-center justify-between p-2 text-sm rounded hover:bg-slate-100 text-left"
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-medium">{customer.name}</span>
                                                <span className="text-xs text-slate-500">{customer.member_number || customer.phone || '-'}</span>
                                            </div>
                                            {selectedCustomer?.id === customer.id && (
                                                <Check className="h-4 w-4 text-slate-900" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}


                {selectedCustomer && (
                    <div className="text-sm bg-red-50 text-red-700 p-2 rounded border border-red-100">
                        Selected: <strong>{selectedCustomer.name}</strong>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">Keranjang kosong</div>
                ) : (
                    cart.map(item => (
                        <div key={item.id} className="flex gap-3 items-start group">
                            <div className="flex-1">
                                <div className="text-sm font-medium text-slate-900">{item.name}</div>
                                <div className="text-xs text-slate-500">Rp {item.price_sell_public.toLocaleString('id-ID')} / {item.unit}</div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => onUpdateQty(item.id, item.qty - 1)}
                                >
                                    <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => onUpdateQty(item.id, item.qty + 1)}
                                >
                                    <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-red-500 opacity-0 group-hover:opacity-100"
                                    onClick={() => onRemove(item.id)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 border-t bg-slate-50 space-y-4">
                <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span>Rp {total.toLocaleString('id-ID')}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={onClear} disabled={cart.length === 0}>
                        Batal
                    </Button>
                    <Button onClick={onCheckout} disabled={cart.length === 0}>
                        Bayar
                    </Button>
                </div>
            </div>
        </div>
    );
}
