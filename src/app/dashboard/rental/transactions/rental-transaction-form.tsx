'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createRentalTransactionAction } from '@/lib/actions/rental';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Trash2, Plus, CalendarIcon } from 'lucide-react';
import { format, differenceInHours, differenceInDays, addDays } from 'date-fns';
import { RentalItem, RentalCustomer } from '@/lib/services/rental-service';

interface Member {
  id: string;
  nama_lengkap: string;
  nomor_anggota: string;
}

interface RentalTransactionFormProps {
  items: RentalItem[];
  customers: RentalCustomer[];
  members: Member[];
}

interface CartItem {
  itemId: string;
  item: RentalItem;
  quantity: number; // For rental usually 1 per specific item ID, but let's keep it flexible
  durationValue: number;
  durationUnit: 'hour' | 'day';
  subtotal: number;
}

export function RentalTransactionForm({ items, customers, members }: RentalTransactionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form State
  const [customerType, setCustomerType] = useState<'member' | 'general'>('member');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  const [rentalDate, setRentalDate] = useState<string>(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [returnDatePlan, setReturnDatePlan] = useState<string>(format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  // Item Selection State
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Available items (filter out rented ones if needed, though the passed items should already be filtered or we filter here)
  const availableItems = items.filter(i => i.status === 'available' && !cart.find(c => c.itemId === i.id));

  const calculateSubtotal = (item: RentalItem, durationVal: number, durationUnit: 'hour' | 'day') => {
    if (durationUnit === 'hour') {
      return item.price_per_hour * durationVal;
    } else {
      return item.price_per_day * durationVal;
    }
  };

  const addToCart = () => {
    if (!selectedItemId) return;
    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;

    // Default duration based on dates
    const start = new Date(rentalDate);
    const end = new Date(returnDatePlan);
    const hours = differenceInHours(end, start);
    const days = differenceInDays(end, start);
    
    // Auto detect best rate
    let durationValue = 1;
    let durationUnit: 'hour' | 'day' = 'day';

    if (days >= 1) {
        durationValue = days;
        durationUnit = 'day';
    } else {
        durationValue = Math.max(1, hours);
        durationUnit = 'hour';
    }

    const subtotal = calculateSubtotal(item, durationValue, durationUnit);

    setCart([...cart, {
      itemId: item.id,
      item,
      quantity: 1,
      durationValue,
      durationUnit,
      subtotal
    }]);
    setSelectedItemId('');
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const updateCartItem = (index: number, field: keyof CartItem, value: any) => {
    const newCart = [...cart];
    const item = newCart[index];
    
    if (field === 'durationValue' || field === 'durationUnit') {
        const dVal = field === 'durationValue' ? Number(value) : item.durationValue;
        const dUnit = field === 'durationUnit' ? value as 'hour' | 'day' : item.durationUnit;
        
        item.durationValue = dVal;
        item.durationUnit = dUnit;
        item.subtotal = calculateSubtotal(item.item, dVal, dUnit);
    }

    setCart(newCart);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const finalAmount = totalAmount + depositAmount - discountAmount;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
        toast.error('Pilih minimal satu unit untuk disewa');
        return;
    }
    if (customerType === 'member' && !selectedMemberId) {
        toast.error('Pilih anggota');
        return;
    }
    if (customerType === 'general' && !selectedCustomerId) {
        toast.error('Pilih pelanggan');
        return;
    }

    setLoading(true);

    try {
      const header = {
        transaction_number: `RNT-${Date.now()}`,
        customer_type: customerType,
        member_id: customerType === 'member' ? selectedMemberId : undefined,
        customer_id: customerType === 'general' ? selectedCustomerId : undefined,
        rental_date: new Date(rentalDate).toISOString(),
        return_date_plan: new Date(returnDatePlan).toISOString(),
        status: 'active' as const,
        total_amount: totalAmount,
        deposit_amount: depositAmount,
        discount_amount: discountAmount,
        fine_amount: 0,
        notes
      };

      const transactionItems = cart.map(c => ({
        item_id: c.itemId,
        quantity: 1,
        price_at_rental: c.durationUnit === 'hour' ? c.item.price_per_hour : c.item.price_per_day,
        duration_value: c.durationValue,
        duration_unit: c.durationUnit,
        subtotal: c.subtotal
      }));

      const result = await createRentalTransactionAction(header, transactionItems, paymentAmount);

      if (result.success) {
        toast.success('Transaksi sewa berhasil dibuat');
        router.push('/dashboard/rental/transactions');
      } else {
        toast.error('Gagal membuat transaksi: ' + result.error);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column: Form Inputs */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Customer Section */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <h2 className="font-semibold text-lg border-b pb-2">Data Penyewa</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Tipe Penyewa</Label>
                <Select value={customerType} onValueChange={(v: any) => setCustomerType(v)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="member">Anggota Koperasi</SelectItem>
                        <SelectItem value="general">Umum (Non-Anggota)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div className="space-y-2">
                <Label>{customerType === 'member' ? 'Pilih Anggota' : 'Pilih Pelanggan'}</Label>
                {customerType === 'member' ? (
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Cari anggota..." />
                        </SelectTrigger>
                        <SelectContent>
                            {members.map(m => (
                                <SelectItem key={m.id} value={m.id}>{m.nama_lengkap} ({m.nomor_anggota})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                ) : (
                    <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Cari pelanggan..." />
                        </SelectTrigger>
                        <SelectContent>
                            {customers.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
          </div>
        </div>

        {/* Date Section */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <h2 className="font-semibold text-lg border-b pb-2">Waktu Sewa</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Tanggal Mulai</Label>
                <Input 
                    type="datetime-local" 
                    value={rentalDate}
                    onChange={e => setRentalDate(e.target.value)}
                />
            </div>
            <div className="space-y-2">
                <Label>Rencana Kembali</Label>
                <Input 
                    type="datetime-local" 
                    value={returnDatePlan}
                    onChange={e => setReturnDatePlan(e.target.value)}
                />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="font-semibold text-lg">Unit Sewa</h2>
          </div>
          
          <div className="flex gap-2">
            <div className="flex-1">
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Pilih unit untuk disewa..." />
                    </SelectTrigger>
                    <SelectContent>
                        {availableItems.length === 0 ? (
                            <div className="p-2 text-sm text-slate-500 text-center">Tidak ada unit tersedia</div>
                        ) : (
                            availableItems.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.name} - Rp {item.price_per_day.toLocaleString()}/hari
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={addToCart} disabled={!selectedItemId}>
                <Plus className="mr-2 h-4 w-4" /> Tambah
            </Button>
          </div>

          {/* Cart Table */}
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                    <tr>
                        <th className="px-4 py-2 text-left">Unit</th>
                        <th className="px-4 py-2 text-center">Durasi</th>
                        <th className="px-4 py-2 text-center">Satuan</th>
                        <th className="px-4 py-2 text-right">Subtotal</th>
                        <th className="px-4 py-2 w-10">Aksi</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {cart.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-500">Belum ada unit dipilih</td>
                        </tr>
                    ) : (
                        cart.map((item, idx) => (
                            <tr key={idx}>
                                <td className="px-4 py-2">
                                    <div className="font-medium">{item.item.name}</div>
                                    <div className="text-xs text-slate-500">
                                        Rp {item.item.price_per_hour.toLocaleString()}/jam • Rp {item.item.price_per_day.toLocaleString()}/hari
                                    </div>
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <Input 
                                        type="number" 
                                        min="1" 
                                        className="w-16 h-8 text-center mx-auto"
                                        value={item.durationValue}
                                        onChange={e => updateCartItem(idx, 'durationValue', e.target.value)}
                                    />
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <Select 
                                        value={item.durationUnit} 
                                        onValueChange={v => updateCartItem(idx, 'durationUnit', v)}
                                    >
                                        <SelectTrigger className="h-8 w-24 mx-auto">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="hour">Jam</SelectItem>
                                            <SelectItem value="day">Hari</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                                <td className="px-4 py-2 text-right font-medium">
                                    Rp {item.subtotal.toLocaleString()}
                                </td>
                                <td className="px-4 py-2 text-center">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeFromCart(idx)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Column: Summary & Payment */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6 sticky top-6">
            <h2 className="font-semibold text-lg border-b pb-2">Rincian Pembayaran</h2>
            
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Total Sewa</span>
                    <span className="font-medium">Rp {totalAmount.toLocaleString()}</span>
                </div>
                
                <div className="space-y-1">
                    <div className="flex justify-between text-sm items-center">
                        <span className="text-slate-600">Deposit / Jaminan</span>
                        <Input 
                            type="number" 
                            className="w-32 h-8 text-right"
                            value={depositAmount}
                            onChange={e => setDepositAmount(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between text-sm items-center">
                        <span className="text-slate-600">Diskon</span>
                        <Input 
                            type="number" 
                            className="w-32 h-8 text-right text-red-600"
                            value={discountAmount}
                            onChange={e => setDiscountAmount(Number(e.target.value))}
                        />
                    </div>
                </div>

                <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-bold text-lg">Total Akhir</span>
                    <span className="font-bold text-lg text-red-600">Rp {finalAmount.toLocaleString()}</span>
                </div>
            </div>

            <div className="space-y-4 border-t pt-4">
                <div className="space-y-2">
                    <Label>Jumlah Bayar (DP / Lunas)</Label>
                    <Input 
                        type="number" 
                        className="text-right font-bold text-lg"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(Number(e.target.value))}
                    />
                    <div className="text-xs text-slate-500 text-right">
                        {paymentAmount >= finalAmount ? 'Lunas' : paymentAmount > 0 ? 'DP / Sebagian' : 'Belum Bayar'}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label>Catatan</Label>
                    <Textarea 
                        placeholder="Catatan tambahan..." 
                        className="h-20"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>
            </div>

            <Button className="w-full" size="lg" onClick={onSubmit} disabled={loading || cart.length === 0}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Buat Transaksi
            </Button>
        </div>
      </div>
    </div>
  );
}
