'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { submitFinancingApplicationAction } from '@/lib/actions/financing';
import { Loader2, Calculator } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
    id: string;
    name: string;
    financing_category: string;
    interest_rate: number;
    interest_type: string;
    max_tenor_months: number;
    min_amount: number;
    max_amount: number;
    admin_fee: number;
}

interface Supplier {
    id: string;
    name: string;
    address?: string;
}

interface Props {
    products: Product[];
    suppliers: Supplier[];
}

export function FinancingApplicationForm({ products, suppliers }: Props) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [objectName, setObjectName] = useState('');
    const [priceOtr, setPriceOtr] = useState<number>(0);
    const [downPayment, setDownPayment] = useState<number>(0);
    const [tenorMonths, setTenorMonths] = useState<number>(12);
    const [description, setDescription] = useState('');
    const [condition, setCondition] = useState<'new' | 'used'>('new');

    // Derived State
    const selectedProduct = products.find(p => p.id === selectedProductId);
    const financingAmount = Math.max(0, priceOtr - downPayment);
    
    // Estimation
    const [monthlyInstallment, setMonthlyInstallment] = useState<number>(0);

    useEffect(() => {
        if (!selectedProduct || financingAmount <= 0 || tenorMonths <= 0) {
            setMonthlyInstallment(0);
            return;
        }

        const principal = financingAmount;
        const ratePerMonth = (selectedProduct.interest_rate / 100) / 12;
        
        let installment = 0;
        if (selectedProduct.interest_type === 'flat') {
            const totalInterest = principal * (selectedProduct.interest_rate / 100) * (tenorMonths / 12);
            installment = (principal + totalInterest) / tenorMonths;
        } else if (selectedProduct.interest_type === 'effective' || selectedProduct.interest_type === 'annuity') {
            // Simplified PMT for annuity/effective estimation
            installment = (principal * ratePerMonth) / (1 - Math.pow(1 + ratePerMonth, -tenorMonths));
        }

        setMonthlyInstallment(installment);
    }, [selectedProduct, financingAmount, tenorMonths]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedProduct || !selectedSupplierId) {
            toast.error('Mohon lengkapi data produk dan vendor');
            return;
        }

        if (financingAmount < selectedProduct.min_amount || financingAmount > selectedProduct.max_amount) {
            toast.error(`Nilai pembiayaan tidak sesuai limit produk (${formatCurrency(selectedProduct.min_amount)} - ${formatCurrency(selectedProduct.max_amount)})`);
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await submitFinancingApplicationAction({
                product_id: selectedProductId,
                tenor_months: tenorMonths,
                object_details: {
                    supplier_id: selectedSupplierId,
                    category: selectedProduct.financing_category as any,
                    name: objectName,
                    condition: condition,
                    price_otr: priceOtr,
                    down_payment: downPayment,
                    description: description,
                    attributes: {} // Can add dynamic attributes later
                }
            });

            if (result.success) {
                toast.success('Pengajuan pembiayaan berhasil dikirim');
                router.push('/member/financing');
            } else {
                toast.error(result.error || 'Gagal mengirim pengajuan');
            }
        } catch (error) {
            toast.error('Terjadi kesalahan sistem');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Pilih Produk */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900 border-b pb-2">1. Pilih Skema Pembiayaan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Produk Pembiayaan</Label>
                        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Produk" />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map(product => (
                                    <SelectItem key={product.id} value={product.id}>
                                        {product.name} ({product.interest_rate}% {product.interest_type})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedProduct && (
                            <p className="text-sm text-slate-500 mt-1">
                                Kategori: <span className="capitalize font-medium">{selectedProduct.financing_category}</span> | 
                                Limit: {formatCurrency(selectedProduct.min_amount)} - {formatCurrency(selectedProduct.max_amount)}
                            </p>
                        )}
                    </div>
                    <div className="space-y-2">
                         <Label>Vendor / Supplier</Label>
                        <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih Vendor Barang" />
                            </SelectTrigger>
                            <SelectContent>
                                {suppliers.map(supplier => (
                                    <SelectItem key={supplier.id} value={supplier.id}>
                                        {supplier.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {suppliers.find(s => s.id === selectedSupplierId)?.address && (
                             <p className="text-sm text-slate-500 mt-1 truncate">
                                {suppliers.find(s => s.id === selectedSupplierId)?.address}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Data Barang */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-slate-900 border-b pb-2">2. Data Objek Pembiayaan</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="objectName">Nama Barang / Unit</Label>
                        <Input 
                            id="objectName" 
                            placeholder="Contoh: Honda Vario 160 CBS" 
                            value={objectName} 
                            onChange={e => setObjectName(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Kondisi Barang</Label>
                        <Select value={condition} onValueChange={(v: any) => setCondition(v)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new">Baru (New)</SelectItem>
                                <SelectItem value="used">Bekas (Used)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="priceOtr">Harga Barang (OTR)</Label>
                        <Input 
                            id="priceOtr" 
                            type="number" 
                            min="0"
                            value={priceOtr || ''} 
                            onChange={e => setPriceOtr(Number(e.target.value))} 
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="downPayment">Uang Muka (DP)</Label>
                        <Input 
                            id="downPayment" 
                            type="number" 
                            min="0"
                            max={priceOtr}
                            value={downPayment || ''} 
                            onChange={e => setDownPayment(Number(e.target.value))} 
                            required 
                        />
                        <p className="text-xs text-slate-500">
                            Nilai Pembiayaan: <span className="font-bold text-slate-700">{formatCurrency(financingAmount)}</span>
                        </p>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Keterangan Tambahan (Warna, Tahun, No Rangka, dll)</Label>
                    <Textarea 
                        id="description" 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        placeholder="Detail spesifikasi barang..." 
                        rows={3}
                    />
                </div>
            </div>

            {/* 3. Simulasi */}
            <div className="space-y-4">
                 <h3 className="text-lg font-medium text-slate-900 border-b pb-2">3. Rencana Angsuran</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="tenor">Jangka Waktu (Bulan)</Label>
                        <Input 
                            id="tenor" 
                            type="number" 
                            min="1" 
                            max={selectedProduct?.max_tenor_months || 60}
                            value={tenorMonths} 
                            onChange={e => setTenorMonths(Number(e.target.value))} 
                            required 
                        />
                         {selectedProduct && (
                            <p className="text-xs text-slate-500">Maksimal: {selectedProduct.max_tenor_months} bulan</p>
                        )}
                    </div>
                    
                    <Card className="bg-red-50 border-red-100">
                        <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                                <Calculator className="w-6 h-6 text-red-600 mt-1" />
                                <div>
                                    <p className="text-sm text-red-600 font-medium">Estimasi Angsuran per Bulan</p>
                                    <h4 className="text-2xl font-bold text-red-700">{formatCurrency(monthlyInstallment)}</h4>
                                    <p className="text-xs text-red-500 mt-1">
                                        *Belum termasuk biaya admin & asuransi jika ada.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                 </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
                <Button variant="outline" type="button" onClick={() => router.back()}>
                    Batal
                </Button>
                <Button type="submit" disabled={isSubmitting || !selectedProduct || financingAmount <= 0}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ajukan Pembiayaan
                </Button>
            </div>
        </form>
    );
}
