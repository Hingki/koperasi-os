'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CartItem } from '@/components/retail/pos/pos-layout';
import { processPharmacyTransactionAction } from '@/lib/actions/retail';
import { Loader2, CheckCircle, Printer, ArrowRight, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';

export function ClinicCheckoutDialog({
    open,
    onOpenChange,
    cart,
    patient,
    koperasiId,
    onSuccess,
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    cart: CartItem[],
    patient: any,
    koperasiId: string,
    onSuccess: () => void,
}) {
    const total = cart.reduce((sum, item) => sum + (item.price_sell_public * item.qty), 0);
    const [cashAmount, setCashAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'cash' | 'qris'>('cash');
    const [successData, setSuccessData] = useState<any>(null);
    const [qrisData, setQrisData] = useState<string | null>(null);
    const router = useRouter();

    const change = Number(cashAmount) - total;
    const canPay = Number(cashAmount) >= total;

    const handleReset = () => {
        setSuccessData(null);
        setQrisData(null);
        setCashAmount('');
        setActiveTab('cash');
        onSuccess(); // Clears cart
        onOpenChange(false);
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const date = new Date().toLocaleString('id-ID');
        const itemsHtml = cart.map(item => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>${item.name} x ${item.qty}</span>
                <span>Rp ${(item.price_sell_public * item.qty).toLocaleString('id-ID')}</span>
            </div>
        `).join('');

        printWindow.document.write(`
            <html>
                <head>
                    <title>Struk Klinik</title>
                    <style>
                        body { font-family: monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .items { margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .total { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
                        .footer { text-align: center; margin-top: 20px; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h2>KLINIK KOPERASI</h2>
                        <p>${date}</p>
                        <p>No: ${successData?.transaction_number || '-'}</p>
                        <p>Pasien: ${patient?.name || 'Umum'}</p>
                    </div>
                    <div class="items">
                        ${itemsHtml}
                    </div>
                    <div class="summary">
                        <div class="total">
                            <span>Total</span>
                            <span>Rp ${total.toLocaleString('id-ID')}</span>
                        </div>
                        <div class="total">
                            <span>Bayar</span>
                            <span>Rp ${Number(cashAmount || total).toLocaleString('id-ID')}</span>
                        </div>
                        <div class="total">
                            <span>Kembali</span>
                            <span>Rp ${Math.max(0, change).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                    <div class="footer">
                        <p>Semoga Lekas Sembuh</p>
                    </div>
                    <script>
                        window.onload = function() { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    async function handlePayment(method: 'cash' | 'qris') {
        setLoading(true);
        try {
            const transactionData = {
                koperasi_id: koperasiId,
                unit_usaha_id: cart[0].unit_usaha_id,
                total_amount: total,
                final_amount: total,
                patient_id: patient?.id,
                patient_name: patient?.name || 'Umum',
                payment_method: method,
            };

            const itemsData = cart.map(item => ({
                product_id: item.id,
                quantity: item.qty,
                price: item.price_sell_public,
                subtotal: item.price_sell_public * item.qty,
                tuslah: 0,
                embalase: 0
            }));

            const paymentData = [{
                method: method,
                amount: total
            }];

            const res = await processPharmacyTransactionAction(transactionData, itemsData, paymentData as any);

            if (res.success) {
                if (method === 'qris' && res.data?.payment_gateway_response?.qr_string) {
                    setQrisData(res.data.payment_gateway_response.qr_string);
                    setSuccessData(res.data);
                } else {
                    setSuccessData(res.data);
                    router.refresh();
                }
            } else {
                // @ts-expect-error - res.error type from action may be string/unknown
                alert(`Gagal memproses transaksi: ${res.error}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !successData && onOpenChange(val)}>
            <DialogContent className="sm:max-w-[500px]">
                {successData && !qrisData ? (
                    <div className="flex flex-col items-center py-6 space-y-6">
                        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-xl font-bold">Transaksi Berhasil</h2>
                            <p className="text-slate-500">
                                Total: Rp {total.toLocaleString('id-ID')}
                                {change >= 0 && <span className="block text-sm">Kembali: Rp {change.toLocaleString('id-ID')}</span>}
                            </p>
                        </div>
                        
                        <div className="flex w-full gap-3">
                            <Button 
                                variant="outline" 
                                className="flex-1" 
                                onClick={handlePrint}
                            >
                                <Printer className="mr-2 h-4 w-4" />
                                Cetak Struk
                            </Button>
                            <Button 
                                className="flex-1" 
                                onClick={handleReset}
                            >
                                Transaksi Baru
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : qrisData ? (
                    <div className="flex flex-col items-center py-6 space-y-6">
                         <div className="text-center space-y-2">
                            <h2 className="text-xl font-bold">Scan QRIS</h2>
                            <p className="text-slate-500">Silakan scan QR Code di bawah ini</p>
                        </div>
                        <div className="p-4 bg-white rounded-lg border shadow-sm">
                            <QRCode value={qrisData} size={200} />
                        </div>
                        <div className="text-center font-bold text-lg">
                            Rp {total.toLocaleString('id-ID')}
                        </div>
                        <Button 
                            className="w-full" 
                            onClick={() => {
                                setQrisData(null); // Assume paid or skip verify for now in this simplified flow
                                router.refresh();
                            }}
                        >
                            Selesai / Cek Status
                        </Button>
                    </div>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle>Pembayaran Klinik</DialogTitle>
                            <DialogDescription>
                                Total Tagihan: <span className="font-bold text-slate-900">Rp {total.toLocaleString('id-ID')}</span>
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="w-full">
                            <div className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-lg mb-4">
                                <button
                                    onClick={() => setActiveTab('cash')}
                                    className={`py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'cash' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    Tunai
                                </button>
                                <button
                                    onClick={() => setActiveTab('qris')}
                                    className={`py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'qris' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
                                >
                                    QRIS
                                </button>
                            </div>
                    
                            {activeTab === 'cash' && (
                                <div className="space-y-4 pt-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Nominal Diterima</label>
                                        <Input 
                                            type="number" 
                                            value={cashAmount} 
                                            onChange={(e) => setCashAmount(e.target.value)}
                                            placeholder="0"
                                            autoFocus
                                        />
                                    </div>
                                    
                                    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                                        <span className="font-medium">Kembalian</span>
                                        <span className={`font-bold text-lg ${change < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            Rp {Math.max(0, change).toLocaleString('id-ID')}
                                        </span>
                                    </div>

                                    <Button 
                                        className="w-full" 
                                        size="lg" 
                                        disabled={!canPay || loading}
                                        onClick={() => handlePayment('cash')}
                                    >
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Bayar Tunai
                                    </Button>
                                </div>
                            )}
                            
                            {activeTab === 'qris' && (
                                <div className="space-y-4 pt-4">
                                    <div className="text-center py-8 space-y-4">
                                        <QrCode className="w-16 h-16 mx-auto text-slate-300" />
                                        <p className="text-slate-500">QRIS akan di-generate otomatis.</p>
                                        <Button 
                                            className="w-full" 
                                            size="lg"
                                            disabled={loading}
                                            onClick={() => handlePayment('qris')}
                                        >
                                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Generate QRIS
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
