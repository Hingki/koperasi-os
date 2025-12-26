'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryProduct } from '@/lib/services/retail-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  CreditCard, 
  Banknote, 
  Wallet,
  X,
  QrCode,
  Scan,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { processPosTransaction, searchProductByBarcode } from '@/lib/actions/retail';
import { getMemberPointsAction, validateVoucherAction } from '@/lib/actions/loyalty';
import { QRISPaymentModal } from '@/components/pos/qris-payment-modal';
import { BarcodeScannerModal } from '@/components/pos/barcode-scanner-modal';

interface Member {
  id: string;
  name: string;
  member_no: string;
}

interface POSInterfaceProps {
  initialProducts: InventoryProduct[];
  members: Member[]; // Keep for fallback or initial load
  user: any;
}

interface CartItem extends InventoryProduct {
  qty: number;
}

export default function POSInterface({ initialProducts, members, user }: POSInterfaceProps) {
  const [products, setProducts] = useState<InventoryProduct[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  
  // Notification State
  const [scanNotification, setScanNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Member State
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [isSearchingMember, setIsSearchingMember] = useState(false);

  // Payment State
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isQRISModalOpen, setIsQRISModalOpen] = useState(false);
  const [qrisData, setQrisData] = useState<{ url: string, id: string, amount: number } | null>(null);
  const [cashGiven, setCashGiven] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Barcode Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'nominal'>('percent');
  
  const [donationAmount, setDonationAmount] = useState(0);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherMessage, setVoucherMessage] = useState('');

  // Effect: Fetch Points when member selected
  useEffect(() => {
    if (selectedMember) {
      getMemberPointsAction(selectedMember.id).then(setPointsBalance);
    } else {
      setPointsBalance(0);
      setUsePoints(false);
    }
  }, [selectedMember]);

  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splitGroups, setSplitGroups] = useState<{ id: string; name: string; method: 'cash' | 'qris' | 'savings_balance'; cashGiven?: string }[]>([{ id: 'g1', name: 'Grup 1', method: 'cash' }]);
  const [itemGroupMap, setItemGroupMap] = useState<Record<string, string>>({});
  const [qrisQueue, setQrisQueue] = useState<{ url: string; id: string; amount: number }[]>([]);
  const [processingSplit, setProcessingSplit] = useState(false);
  
  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      (p.barcode && p.barcode.includes(search)) ||
      (p.sku && p.sku.includes(search))
    );
  }, [products, search]);

  // Handle Barcode Scan
  const handleScan = async (code: string) => {
    setIsScannerOpen(false);
    setSearch(code);
    setScanNotification(null);
    
    // 1. Check local state first (optimization)
    const exactMatch = products.find(p => p.barcode === code || p.sku === code);
    
    if (exactMatch) {
        addToCart(exactMatch);
        showScanNotification('success', `Berhasil menambahkan ${exactMatch.name}`);
        return;
    }

    // 2. If not found locally, check server via Server Action
    const result = await searchProductByBarcode(code);

    if (result.success && result.data) {
        const product = result.data as InventoryProduct;
        
        // Add to local products list so it's available
        setProducts(prev => {
            if (prev.find(p => p.id === product.id)) return prev;
            return [...prev, product];
        });
        
        // Add to cart
        addToCart(product);
        showScanNotification('success', `Berhasil menambahkan ${product.name}`);
    } else {
        showScanNotification('error', `Produk dengan barcode ${code} tidak ditemukan.`);
    }
  };

  const showScanNotification = (type: 'success' | 'error', message: string) => {
      setScanNotification({ type, message });
      setTimeout(() => setScanNotification(null), 3000);
  };

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => {
    const price = selectedMember ? item.price_sell_member : item.price_sell_public;
    return sum + (price * item.qty);
  }, 0);

  // Effect: Validate Voucher when code changes (debounced ideally, but button for now)
  const handleCheckVoucher = async () => {
    if (!voucherCode) return;
    setVoucherMessage('Memeriksa...');
    const res = await validateVoucherAction(voucherCode, subtotal, user.user_metadata.koperasi_id);
    if (res.valid) {
      setVoucherDiscount(res.discountAmount || 0);
      setVoucherMessage(`Sukses: Hemat Rp ${(res.discountAmount || 0).toLocaleString('id-ID')}`);
    } else {
      setVoucherDiscount(0);
      setVoucherMessage(`Error: ${res.message}`);
    }
  };
  
  const tax = 0; 
  const discountValueNum = Number(discountInput) || 0;
  const discountAmount = discountType === 'percent' ? Math.min(subtotal * (discountValueNum / 100), subtotal) : Math.min(discountValueNum, subtotal);
  
  const pointsValue = usePoints ? Math.min(pointsBalance, Math.max(0, subtotal - discountAmount - voucherDiscount)) : 0;
  const total = Math.max(0, subtotal - discountAmount - voucherDiscount - pointsValue + donationAmount + tax);
  
  const change = (Number(cashGiven) || 0) - total;

  const addGroup = () => {
    const idx = splitGroups.length + 1;
    const newId = `g${idx}`;
    setSplitGroups(prev => [...prev, { id: newId, name: `Grup ${idx}`, method: 'cash' }]);
  };

  const removeGroup = (id: string) => {
    if (id === 'g1') return;
    const remaining = splitGroups.filter(g => g.id !== id);
    const reassigned: Record<string, string> = {};
    for (const item of cart) {
      const gid = itemGroupMap[item.id] || 'g1';
      reassigned[item.id] = gid === id ? 'g1' : gid;
    }
    setItemGroupMap(reassigned);
    setSplitGroups(remaining);
  };

  const setItemGroup = (productId: string, groupId: string) => {
    setItemGroupMap(prev => ({ ...prev, [productId]: groupId }));
  };

  const groupTotals = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const item of cart) {
      const price = selectedMember ? item.price_sell_member : item.price_sell_public;
      const gid = itemGroupMap[item.id] || 'g1';
      sums[gid] = (sums[gid] || 0) + price * item.qty;
    }
    return splitGroups.map(g => {
      const sub = sums[g.id] || 0;
      const discShare = subtotal > 0 ? discountAmount * (sub / subtotal) : 0;
      const taxShare = subtotal > 0 ? tax * (sub / subtotal) : 0;
      const final = Math.max(0, sub - discShare + taxShare);
      return { id: g.id, subtotal: sub, discount: discShare, tax: taxShare, final };
    });
  }, [cart, itemGroupMap, splitGroups, selectedMember, subtotal, discountAmount, tax]);

  const addToCart = (product: InventoryProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setItemGroupMap(prev => ({ ...prev, [product.id]: 'g1' }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
    setItemGroupMap(prev => {
      const { [productId]: _, ...rest } = prev;
      return rest;
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }));
  };

  const handleMemberSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!memberSearch.trim()) return;

    setIsSearchingMember(true);
    try {
        const res = await fetch(`/api/members/search?q=${encodeURIComponent(memberSearch)}`);
        const data = await res.json();
        
        if (Array.isArray(data) && data.length > 0) {
            // Map API response to Member interface
            const member = {
                id: data[0].id,
                name: data[0].nama_lengkap,
                member_no: data[0].nomor_anggota
            };
            setSelectedMember(member);
            setMemberSearch('');
        } else {
            alert('Anggota tidak ditemukan');
        }
    } catch (error) {
        console.error('Member search error:', error);
        alert('Gagal mencari anggota');
    } finally {
        setIsSearchingMember(false);
    }
  };

  const processCheckout = async (method: 'cash' | 'qris' | 'savings_balance') => {
    setLoading(true);

    try {
      // 1. Prepare items
      const items = cart.map(item => ({
        product_id: item.id,
        quantity: item.qty,
        price_at_sale: selectedMember ? item.price_sell_member : item.price_sell_public,
        cost_at_sale: item.price_cost,
        subtotal: (selectedMember ? item.price_sell_member : item.price_sell_public) * item.qty
      }));

      // 2. Call Server Action
      const result = await processPosTransaction(
        {
          koperasi_id: user.user_metadata.koperasi_id,
          unit_usaha_id: products[0]?.unit_usaha_id || user.user_metadata.unit_usaha_id, // Fallback
          member_id: selectedMember?.id || null,
          customer_name: selectedMember ? selectedMember.name : 'General Customer',
          total_amount: subtotal,
          discount_amount: discountAmount + voucherDiscount,
          tax_amount: tax,
          final_amount: total,
          payment_method: method,
          payment_status: method === 'qris' ? 'pending' : 'paid',
          // New Fields (Cast to any to bypass type check if interface not updated yet)
          ...({
             donation_amount: donationAmount,
             voucher_code: voucherCode || null,
             points_used: pointsValue > 0 ? pointsValue : 0, // 1 point = 1 rupiah
             points_value: pointsValue
          } as any)
        },
        items
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      // 3. Handle Result
      if (method === 'qris') {
          // Open QRIS Modal
          setQrisData({
              url: result.data.qr_code_url,
              id: result.data.payment_transaction_id,
              amount: total
          });
          setIsQRISModalOpen(true);
      } else {
          // Cash or Savings - Instant Success
          alert('Transaksi Berhasil!');
          resetCart();
      }
      
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetCart = () => {
      setCart([]);
      setCashGiven('');
      setIsCashModalOpen(false);
      setIsQRISModalOpen(false);
      setQrisData(null);
      // Keep selected member? Maybe yes for convenience.
      setIsSplitMode(false);
      setSplitGroups([{ id: 'g1', name: 'Grup 1', method: 'cash' }]);
      setItemGroupMap({});
      setQrisQueue([]);
      setProcessingSplit(false);
  };

  const processSplitCheckout = async () => {
    if (cart.length === 0) return;
    setProcessingSplit(true);
    try {
      const resultsQris: { url: string; id: string; amount: number }[] = [];
      for (const g of splitGroups) {
        const totals = groupTotals.find(gt => gt.id === g.id);
        const groupItems = cart
          .filter(item => (itemGroupMap[item.id] || 'g1') === g.id)
          .map(item => ({
            product_id: item.id,
            quantity: item.qty,
            price_at_sale: selectedMember ? item.price_sell_member : item.price_sell_public,
            cost_at_sale: item.price_cost,
            subtotal: (selectedMember ? item.price_sell_member : item.price_sell_public) * item.qty
          }));
        if (!totals || totals.final <= 0 || groupItems.length === 0) continue;
        if (g.method === 'savings_balance' && !selectedMember) {
          throw new Error('Pilih anggota untuk pembayaran saldo simpanan');
        }
        if (g.method === 'cash') {
          const cg = Number(g.cashGiven || '0');
          if (cg > 0 && cg < totals.final) {
            throw new Error(`Uang tunai untuk ${g.name} kurang`);
          }
        }
        const result = await processPosTransaction(
          {
            koperasi_id: user.user_metadata.koperasi_id,
            unit_usaha_id: products[0]?.unit_usaha_id || user.user_metadata.unit_usaha_id,
            member_id: selectedMember?.id || undefined,
            customer_name: selectedMember ? selectedMember.name : 'General Customer',
            total_amount: totals.subtotal,
            discount_amount: totals.discount,
            tax_amount: totals.tax,
            final_amount: totals.final,
            payment_method: g.method,
            payment_status: g.method === 'qris' ? 'pending' : 'paid'
          },
          groupItems
        );
        if (!result.success) {
          throw new Error(result.error);
        }
        if (g.method === 'qris') {
          resultsQris.push({
            url: result.data.qr_code_url,
            id: result.data.payment_transaction_id,
            amount: totals.final
          });
        }
      }
      if (resultsQris.length > 0) {
        setQrisQueue(resultsQris);
        const first = resultsQris[0];
        setQrisData(first);
        setIsQRISModalOpen(true);
      } else {
        alert('Transaksi Split Berhasil!');
        resetCart();
      }
    } catch (e: any) {
      alert('Error: ' + e.message);
    } finally {
      setProcessingSplit(false);
    }
  };

  return (
    <div className="flex h-full flex-col md:flex-row bg-slate-100">
      {/* LEFT: Product Grid */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden">
        {/* Search Bar & Scanner */}
        <div className="mb-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              aria-label="Cari produk"
              placeholder="Cari produk (Nama, SKU, Barcode)..." 
              className="pl-10 h-12 text-lg bg-white shadow-sm border-0"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <Button 
            className="h-12 w-12 md:w-auto md:px-4 bg-slate-800 hover:bg-slate-700"
            onClick={() => setIsScannerOpen(true)}
            title="Scan Barcode"
          >
            <Scan className="h-5 w-5 md:mr-2" />
            <span className="hidden md:inline">Scan</span>
          </Button>
        </div>

        {/* Sale Type Indicator */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-slate-600">
            Mode Penjualan: <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${selectedMember ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'}`}>
              {selectedMember ? 'Anggota' : 'Umum'}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Harga {selectedMember ? 'Anggota' : 'Umum'} ditampilkan
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center text-slate-400 py-20">
              <Search className="h-12 w-12 mb-2 opacity-20" />
              <p>Produk tidak ditemukan</p>
            </div>
          ) : (
            filteredProducts.map(product => (
                <button
                type="button"
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between group h-[160px]"
                >
                <div>
                    <h3 className="font-semibold text-slate-900 line-clamp-2 group-hover:text-red-600">
                    {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">{product.sku}</p>
                    {product.product_type === 'consignment' && (
                      <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">Konsinyasi</span>
                    )}
                </div>
                <div className="mt-2">
                    <div className="text-lg font-bold text-red-600">
                      Rp {selectedMember ? product.price_sell_member.toLocaleString('id-ID') : product.price_sell_public.toLocaleString('id-ID')}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {selectedMember ? `Harga Anggota • Umum Rp ${product.price_sell_public.toLocaleString('id-ID')}` : `Harga Umum • Anggota Rp ${product.price_sell_member.toLocaleString('id-ID')}`}
                    </div>
                    <div className={`text-xs mt-1 ${product.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    Stok: {product.stock_quantity}
                    </div>
                </div>
                </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="w-full md:w-[400px] bg-white border-l shadow-xl flex flex-col h-full z-10">
        {/* Header: Member Selection */}
        <div className="p-4 border-b bg-slate-50">
           <div className="flex items-center justify-between mb-2">
             <h2 className="font-bold text-slate-800 flex items-center gap-2">
               <ShoppingCart className="h-5 w-5" />
               Keranjang
             </h2>
             <button type="button" onClick={() => setCart([])} className="text-xs text-red-500 hover:underline">
               Reset
             </button>
           </div>
           
           {selectedMember ? (
             <div className="flex items-center justify-between bg-red-50 p-2 rounded-lg border border-red-100">
               <div className="flex items-center gap-2">
                 <User className="h-4 w-4 text-red-600" />
                 <div>
                   <p className="text-sm font-bold text-red-900">{selectedMember.name}</p>
                   <p className="text-xs text-red-700">{selectedMember.member_no}</p>
                 </div>
               </div>
               <button type="button" title="Hapus anggota" aria-label="Hapus anggota" onClick={() => setSelectedMember(null)} className="p-1 hover:bg-red-100 rounded">
                 <X className="h-4 w-4 text-red-500" />
               </button>
             </div>
           ) : (
             <div className="space-y-2">
                 <form onSubmit={handleMemberSearch} className="flex gap-2">
                     <Input 
                        placeholder="No. Anggota / Nama..." 
                        className="h-9 text-sm bg-white"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        onBlur={() => handleMemberSearch()}
                     />
                     <Button type="submit" size="sm" variant="secondary" className="h-9" disabled={isSearchingMember}>
                        {isSearchingMember ? '...' : <Search className="h-4 w-4" />}
                     </Button>
                 </form>
                 <div className="text-xs text-center text-slate-500">
                    Ketik dan tekan enter atau klik luar untuk mencari
                 </div>
             </div>
           )}
           <div className="mt-3 flex items-center justify-between">
             <span className="text-xs text-slate-600">Split Bill</span>
             <button
               type="button"
               className={`text-xs px-2 py-1 rounded ${isSplitMode ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}
               onClick={() => setIsSplitMode(v => !v)}
             >
               {isSplitMode ? 'Aktif' : 'Nonaktif'}
             </button>
           </div>
           {isSplitMode && (
             <div className="mt-2 space-y-2">
               <div className="flex items-center justify-between">
                 <span className="text-xs font-medium text-slate-700">Grup Pembayaran</span>
                 <button type="button" className="text-xs text-red-600 hover:underline" onClick={addGroup}>Tambah Grup</button>
               </div>
               <div className="space-y-2">
                 {splitGroups.map(g => {
                   const totals = groupTotals.find(gt => gt.id === g.id);
                   return (
                     <div key={g.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border">
                       <div className="flex-1">
                         <div className="text-xs font-semibold text-slate-800">{g.name}</div>
                         <div className="text-[11px] text-slate-600">Total Rp {(totals?.final || 0).toLocaleString('id-ID')}</div>
                       </div>
                       <div className="flex items-center gap-2">
                         <select
                           className="text-xs border rounded px-2 py-1 bg-white"
                           value={g.method}
                           onChange={(e) => {
                             const val = e.target.value as 'cash' | 'qris' | 'savings_balance';
                             setSplitGroups(prev => prev.map(x => x.id === g.id ? { ...x, method: val } : x));
                           }}
                           title="Metode grup"
                         >
                           <option value="cash">Tunai</option>
                           <option value="qris">QRIS</option>
                           <option value="savings_balance" disabled={!selectedMember}>Saldo</option>
                         </select>
                         {g.method === 'cash' && (
                           <Input
                             placeholder="Uang diterima"
                             className="h-8 w-28 text-right"
                             type="number"
                             value={g.cashGiven || ''}
                             onChange={(e) => {
                               const val = e.target.value;
                               setSplitGroups(prev => prev.map(x => x.id === g.id ? { ...x, cashGiven: val } : x));
                             }}
                           />
                         )}
                         {g.id !== 'g1' && (
                           <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => removeGroup(g.id)}>Hapus</button>
                         )}
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <ShoppingCart className="h-12 w-12 opacity-20" />
              <p>Keranjang kosong</p>
            </div>
          ) : (
            cart.map(item => {
               const price = selectedMember ? item.price_sell_member : item.price_sell_public;
               return (
                <div key={item.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm text-slate-900 line-clamp-1">{item.name}</h4>
                    <p className="text-xs text-red-600 font-medium">Rp {price.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {isSplitMode && (
                      <select
                        className="text-xs border rounded px-2 py-1 bg-white"
                        value={itemGroupMap[item.id] || 'g1'}
                        onChange={(e) => setItemGroup(item.id, e.target.value)}
                        title="Kelompok item"
                      >
                        {splitGroups.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    )}
                    <div className="flex items-center bg-white rounded-md border shadow-sm">
                      <button type="button" aria-label="Kurangi" onClick={() => updateQty(item.id, -1)} className="p-1 hover:bg-slate-100"><Minus className="h-3 w-3" /></button>
                      <span className="w-8 text-center text-sm font-medium">{item.qty}</span>
                      <button type="button" aria-label="Tambah" onClick={() => updateQty(item.id, 1)} className="p-1 hover:bg-slate-100"><Plus className="h-3 w-3" /></button>
                    </div>
                    <button type="button" aria-label="Hapus item" onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
               );
            })
          )}
        </div>

        {/* Footer: Totals & Checkout */}
        <div className="p-4 border-t bg-slate-50 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium">Rp {subtotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-500">Diskon</span>
              <div className="flex items-center gap-2">
                <Input 
                  placeholder={discountType === 'percent' ? '0%' : 'Rp 0'} 
                  className="h-9 w-28 text-right" 
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  type="number"
                  min="0"
                />
                <div className="flex rounded-md overflow-hidden border">
                  <button 
                    type="button" 
                    className={`px-2 h-9 text-sm ${discountType === 'nominal' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`} 
                    onClick={() => setDiscountType('nominal')}
                    title="Nominal"
                  >
                    Rp
                  </button>
                  <button 
                    type="button" 
                    className={`px-2 h-9 text-sm border-l ${discountType === 'percent' ? 'bg-slate-800 text-white' : 'bg-white text-slate-700'}`} 
                    onClick={() => setDiscountType('percent')}
                    title="Persen"
                  >
                    %
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Potongan</span>
              <span>Rp {discountAmount.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Donation */}
          <div className="flex items-center justify-between gap-2">
             <span className="text-sm text-slate-500">Donasi</span>
             <div className="relative">
                <span className="absolute left-3 top-2 text-xs">Rp</span>
                <Input 
                   type="number" 
                   className="h-8 w-32 pl-8 text-right text-sm" 
                   value={donationAmount || ''}
                   onChange={e => setDonationAmount(Number(e.target.value))}
                   placeholder="0"
                />
             </div>
          </div>

          {/* Voucher */}
          <div className="space-y-1">
             <div className="flex gap-2">
                <Input 
                   placeholder="Kode Voucher" 
                   className="h-8 text-sm uppercase" 
                   value={voucherCode}
                   onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                />
                <Button variant="outline" size="sm" className="h-8" onClick={handleCheckVoucher}>Cek</Button>
             </div>
             {voucherMessage && <p className={`text-[10px] ${voucherDiscount > 0 ? 'text-green-600' : 'text-red-500'}`}>{voucherMessage}</p>}
             {voucherDiscount > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                   <span>Voucher</span>
                   <span>-Rp {voucherDiscount.toLocaleString('id-ID')}</span>
                </div>
             )}
          </div>

          {/* Points */}
          {selectedMember && pointsBalance > 0 && (
             <div className="flex items-center justify-between bg-amber-50 p-2 rounded border border-amber-100">
                <div className="text-xs text-amber-800">
                   <p className="font-medium">Poin: {pointsBalance}</p>
                   <p>Tukar Poin?</p>
                </div>
                <div className="flex items-center gap-2">
                   <span className="text-xs font-bold text-amber-700">
                      {usePoints ? `-Rp ${pointsValue.toLocaleString('id-ID')}` : ''}
                   </span>
                   <input 
                      type="checkbox" 
                      className="toggle toggle-sm toggle-warning" 
                      checked={usePoints}
                      onChange={e => setUsePoints(e.target.checked)}
                   />
                </div>
             </div>
          )}

          <div className="flex justify-between text-lg font-bold text-slate-900 border-t pt-2">
            <span>Total</span>
            <span>Rp {total.toLocaleString('id-ID')}</span>
          </div>

          {!isSplitMode && (
            <div className="grid grid-cols-3 gap-2">
              <Button 
                className="bg-green-600 hover:bg-green-700 h-12 flex flex-col items-center justify-center gap-0 leading-tight"
                onClick={() => setIsCashModalOpen(true)}
                disabled={cart.length === 0}
              >
                <Banknote className="h-5 w-5 mb-1" />
                <span className="text-xs">TUNAI</span>
              </Button>
              <Button 
            className="bg-red-600 hover:bg-red-700 h-12 flex flex-col items-center justify-center gap-0 leading-tight"
            onClick={() => processCheckout('qris')}
            disabled={cart.length === 0 || loading}
          >
                <QrCode className="h-5 w-5 mb-1" />
                <span className="text-xs">QRIS</span>
              </Button>
              <Button 
                className={`h-12 flex flex-col items-center justify-center gap-0 leading-tight ${selectedMember ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-300 text-slate-500'}`}
                onClick={() => {
                  if (confirm(`Bayar Rp ${total.toLocaleString('id-ID')} dengan Saldo Simpanan?`)) {
                    processCheckout('savings_balance');
                  }
                }}
                disabled={cart.length === 0 || !selectedMember || loading}
              >
                <Wallet className="h-5 w-5 mb-1" />
                <span className="text-xs">SALDO</span>
              </Button>
            </div>
          )}
          {isSplitMode && (
            <div className="grid grid-cols-1 gap-2">
              <Button 
                className="bg-slate-800 hover:bg-slate-900 h-12"
                onClick={processSplitCheckout}
                disabled={cart.length === 0 || processingSplit}
              >
                {processingSplit ? 'Memproses...' : 'Proses Split Bill'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* QRIS Payment Modal */}
      {isQRISModalOpen && qrisData && (
        <QRISPaymentModal 
          isOpen={isQRISModalOpen}
          amount={qrisData.amount} 
          qrCodeUrl={qrisData.url}
          transactionId={qrisData.id}
          onSuccess={() => {
              const rest = qrisQueue.slice(1);
              if (rest.length > 0) {
                setQrisQueue(rest);
                setQrisData(rest[0]);
              } else {
                setIsQRISModalOpen(false);
                alert('Pembayaran QRIS Berhasil!');
                resetCart();
              }
          }} 
          onClose={() => setIsQRISModalOpen(false)}
        />
      )}

      {/* Cash Payment Modal */}
      {isCashModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg">Pembayaran Tunai</h3>
              <button type="button" onClick={() => setIsCashModalOpen(false)} aria-label="Close modal"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="text-center">
                <p className="text-slate-500 text-sm">Total Tagihan</p>
                <h2 className="text-4xl font-bold text-red-600">Rp {total.toLocaleString('id-ID')}</h2>
              </div>

              <div className="space-y-2">
                <label htmlFor="cash_given" className="text-sm font-medium">Uang Diterima</label>
                <Input 
                  id="cash_given"
                  type="number" 
                  className="text-lg h-12" 
                  placeholder="0" 
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-slate-500">Kembalian</span>
                  <span className={`font-bold ${change < 0 ? 'text-red-500' : 'text-green-600'}`}>
                    Rp {change.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setIsCashModalOpen(false)}>Batal</Button>
              <Button 
                className="flex-1" 
                onClick={() => processCheckout('cash')} 
                disabled={loading || change < 0}
              >
                {loading ? 'Memproses...' : 'Selesaikan Transaksi'}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Scan Notification Toast */}
      {scanNotification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-lg flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 ${
            scanNotification.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
            {scanNotification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
            ) : (
                <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">{scanNotification.message}</span>
        </div>
      )}
      
      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
      />
    </div>
  );
}
