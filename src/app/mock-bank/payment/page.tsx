
'use client';

import { useState } from 'react';
import { processVAPayment } from '@/lib/actions/digital-payment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export default function MockBankPaymentPage() {
    const [vaNumber, setVaNumber] = useState('');
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handlePay = async () => {
        if (!vaNumber || !amount) return;
        setLoading(true);
        const res = await processVAPayment(vaNumber, Number(amount));
        setLoading(false);

        if (res.success) {
            toast({ 
                title: 'Pembayaran Berhasil', 
                description: `Transfer Rp ${amount} ke VA ${vaNumber} sukses.`,
                className: 'bg-green-50 text-green-900 border-green-200'
            });
            setVaNumber('');
            setAmount('');
        } else {
            toast({ 
                variant: 'destructive', 
                title: 'Pembayaran Gagal', 
                description: res.error 
            });
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="bg-red-600 text-white rounded-t-lg">
                    <CardTitle className="flex items-center gap-2">
                        <span>🏦</span> Simulator M-Banking
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nomor Virtual Account</label>
                        <Input 
                            value={vaNumber} 
                            onChange={(e) => setVaNumber(e.target.value)} 
                            placeholder="Contoh: 880008123..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nominal Transfer</label>
                        <Input 
                            type="number" 
                            value={amount} 
                            onChange={(e) => setAmount(e.target.value)} 
                            placeholder="Min. 10000"
                        />
                    </div>
                    <Button 
                        className="w-full bg-red-600 hover:bg-red-700" 
                        onClick={handlePay}
                        disabled={loading || !vaNumber || !amount}
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Kirim Pembayaran
                    </Button>
                    <p className="text-xs text-center text-slate-500 mt-4">
                        Halaman ini hanya simulasi untuk development.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
