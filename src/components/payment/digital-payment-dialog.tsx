'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, QrCode, CheckCircle, AlertCircle } from 'lucide-react';
import { createDigitalPaymentAction, checkPaymentStatusAction, simulatePaymentSuccessAction } from '@/lib/actions/payment';
import { formatCurrency } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { useRouter } from 'next/navigation';

interface DigitalPaymentDialogProps {
  type: 'savings_deposit' | 'loan_payment';
  referenceId: string;
  defaultAmount?: number;
  minAmount?: number;
  title?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  fixedAmount?: boolean;
}

export function DigitalPaymentDialog({ 
  type, 
  referenceId, 
  defaultAmount = 0, 
  minAmount = 10000,
  title = "Pembayaran Digital",
  trigger,
  onSuccess,
  fixedAmount = false
}: DigitalPaymentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(defaultAmount);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'input' | 'payment' | 'success'>('input');
  const [paymentData, setPaymentData] = useState<any>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    if (amount < minAmount) {
      alert(`Minimal pembayaran adalah ${formatCurrency(minAmount)}`);
      return;
    }

    setLoading(true);
    try {
      const res = await createDigitalPaymentAction(type, referenceId, amount, 'qris');
      if (res.success) {
        setPaymentData(res.data);
        setStep('payment');
      } else {
        alert(res.error);
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateSuccess = async () => {
    if (!paymentData?.id) return;
    setLoading(true);
    try {
      await simulatePaymentSuccessAction(paymentData.id);
      setStep('success');
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('input');
    setPaymentData(null);
    if (!fixedAmount) setAmount(defaultAmount);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if(!v) reset(); else setIsOpen(true); }}>
      <DialogTrigger asChild>
        {trigger || <Button>Bayar Sekarang</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {step === 'input' && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nominal Pembayaran</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-500">Rp</span>
                <Input 
                  type="number" 
                  value={amount || ''} 
                  onChange={(e) => setAmount(Number(e.target.value))}
                  disabled={fixedAmount}
                  className="pl-10 text-lg font-semibold"
                  min={minAmount}
                />
              </div>
              <p className="text-xs text-slate-500">
                Minimal pembayaran: {formatCurrency(minAmount)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="border rounded-lg p-3 flex flex-col items-center justify-center gap-2 bg-slate-50 border-emerald-500 ring-1 ring-emerald-500 cursor-pointer">
                  <QrCode className="h-6 w-6 text-emerald-600" />
                  <span className="text-sm font-medium">QRIS</span>
                </div>
                <div className="border rounded-lg p-3 flex flex-col items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                  <span className="text-sm font-bold text-slate-400">VA Bank</span>
                  <span className="text-xs text-slate-400">(Segera)</span>
                </div>
              </div>
            </div>

            <Button onClick={handleGenerate} className="w-full mt-4" disabled={loading || amount < minAmount}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lanjut Pembayaran'}
            </Button>
          </div>
        )}

        {step === 'payment' && paymentData && (
          <div className="flex flex-col items-center py-4 space-y-6">
            <div className="text-center space-y-1">
              <p className="text-slate-500">Total Tagihan</p>
              <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(amount)}</h3>
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm">
               <QRCodeSVG value={paymentData.qr_code_url || "mock-qr"} size={200} />
            </div>

            <div className="text-center text-sm text-slate-500 max-w-[250px]">
              Scan QR Code di atas menggunakan aplikasi e-wallet atau mobile banking Anda.
            </div>

            <div className="w-full pt-4 border-t">
              <Button 
                variant="outline" 
                className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50"
                onClick={handleSimulateSuccess}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Simulasi Pembayaran Berhasil (Demo)
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="flex flex-col items-center py-8 space-y-4 animate-in fade-in zoom-in">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8" />
            </div>
            <div className="text-center">
              <h3 className="text-xl font-bold text-slate-900">Pembayaran Berhasil!</h3>
              <p className="text-slate-500 mt-2">Saldo Anda telah diperbarui.</p>
            </div>
            <Button onClick={reset} className="mt-4 min-w-[150px]">
              Selesai
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
