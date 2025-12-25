'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Calculator, Info } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { submitFinancingApplicationAction } from '@/lib/actions/financing';

interface Props {
    products: any[];
    suppliers: any[];
}

export function FinancingForm({ products, suppliers }: Props) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    // Form State
    const [productId, setProductId] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [category, setCategory] = useState<string>('vehicle');
    const [objectName, setObjectName] = useState('');
    const [condition, setCondition] = useState<string>('new');
    const [priceOtr, setPriceOtr] = useState<number>(0);
    const [downPayment, setDownPayment] = useState<number>(0);
    const [tenor, setTenor] = useState<number>(12);
    const [description, setDescription] = useState('');

    // Derived State
    const selectedProduct = products.find(p => p.id === productId);
    const financingAmount = Math.max(0, priceOtr - downPayment);
    
    // Simulation
    const calculateInstallment = () => {
        if (!selectedProduct || financingAmount <= 0) return 0;
        
        const rate = Number(selectedProduct.interest_rate); // Annual %
        const principal = financingAmount;
        
        if (selectedProduct.interest_type === 'flat') {
            const totalInterest = principal * (rate / 100) * (tenor / 12);
            return (principal + totalInterest) / tenor;
        }
        // Simple fallback for other types in UI simulation
        const totalInterest = principal * (rate / 100) * (tenor / 12);
        return (principal + totalInterest) / tenor;
    };

    const estimatedInstallment = calculateInstallment();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId || financingAmount <= 0) return;

        setLoading(true);
        const res = await submitFinancingApplicationAction({
            product_id: productId,
            tenor_months: tenor,
            object_details: {
                category: category as any,
                name: objectName,
                condition: condition as any,
                price_otr: priceOtr,
                down_payment: downPayment,
                supplier_id: supplierId,
                attributes: {}, // Can extend form to capture dynamic attributes
                description
            }
        });
        setLoading(false);

        if (res.success) {
            toast({ title: 'Pengajuan Berhasil', description: 'Pengajuan pembiayaan Anda telah dikirim.' });
            router.push('/member/financing');
        } else {
            toast({ variant: 'destructive', title: 'Gagal', description: res.error });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Informasi Pembiayaan</CardTitle>
                    <CardDescription>Pilih skema pembiayaan dan detail barang.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Produk Pembiayaan</Label>
                            <Select onValueChange={setProductId} value={productId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Skema" />
                                </SelectTrigger>
                                <SelectContent>
                                    {products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} (Bunga {p.interest_rate}% p.a)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedProduct && (
                                <p className="text-xs text-slate-500">
                                    Max: {formatCurrency(selectedProduct.max_amount)} | Tenor Max: {selectedProduct.max_tenor_months} bln
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Vendor / Supplier (Opsional)</Label>
                            <Select onValueChange={setSupplierId} value={supplierId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih Vendor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map(s => (
                                        <SelectItem key={s.id} value={s.id}>
                                            {s.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Kategori Barang</Label>
                            <Select onValueChange={setCategory} value={category}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vehicle">Kendaraan</SelectItem>
                                    <SelectItem value="electronics">Elektronik</SelectItem>
                                    <SelectItem value="furniture">Furniture</SelectItem>
                                    <SelectItem value="property">Properti</SelectItem>
                                    <SelectItem value="gold">Logam Mulia</SelectItem>
                                    <SelectItem value="other">Lainnya</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Nama Barang / Tipe</Label>
                            <Input 
                                placeholder="Contoh: Honda Vario 160 CBS" 
                                value={objectName}
                                onChange={e => setObjectName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Kondisi</Label>
                            <Select onValueChange={setCondition} value={condition}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">Baru</SelectItem>
                                    <SelectItem value="used">Bekas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Jangka Waktu (Bulan)</Label>
                            <Select onValueChange={(v) => setTenor(Number(v))} value={tenor.toString()}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[6, 12, 18, 24, 36, 48, 60].map(m => (
                                        <SelectItem key={m} value={m.toString()}>
                                            {m} Bulan
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Deskripsi / Spesifikasi Detail</Label>
                        <Textarea 
                            placeholder="Warna, Tahun, No Rangka (jika ada), dll..." 
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Simulasi Pembiayaan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Harga OTR / Cash (Rp)</Label>
                                <Input 
                                    type="number" 
                                    value={priceOtr}
                                    onChange={e => setPriceOtr(Number(e.target.value))}
                                    min={0}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Uang Muka / DP (Rp)</Label>
                                <Input 
                                    type="number" 
                                    value={downPayment}
                                    onChange={e => setDownPayment(Number(e.target.value))}
                                    min={0}
                                />
                            </div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600">Nilai Pembiayaan:</span>
                                <span className="font-semibold">{formatCurrency(financingAmount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600">Bunga ({selectedProduct?.interest_rate || 0}% p.a):</span>
                                <span className="font-semibold">Flat / Tetap</span>
                            </div>
                            <div className="pt-3 border-t border-blue-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-700 font-medium">Estimasi Angsuran:</span>
                                    <span className="text-xl font-bold text-blue-700">
                                        {formatCurrency(estimatedInstallment)}
                                        <span className="text-xs font-normal text-slate-500 ml-1">/bln</span>
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-start gap-2 text-xs text-blue-600 mt-2">
                                <Info className="w-4 h-4 mt-0.5" />
                                <p>Simulasi ini adalah estimasi. Nilai angsuran final akan ditentukan setelah persetujuan.</p>
                            </div>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700" 
                        size="lg"
                        disabled={loading || !productId || financingAmount <= 0}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Ajukan Pembiayaan
                    </Button>
                </CardContent>
            </Card>
        </form>
    );
}
