'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { PaymentStatus } from '@/lib/types/payment';

interface QRISPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeUrl: string;
  transactionId: string;
  amount: number;
  onSuccess?: () => void;
}

export function QRISPaymentModal({
  isOpen,
  onClose,
  qrCodeUrl,
  transactionId,
  amount,
  onSuccess
}: QRISPaymentModalProps) {
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    if (!isOpen) return;

    // Reset status when modal opens
    setStatus('pending');
    setTimeLeft(300);

    // Timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Polling
    const poller = setInterval(async () => {
      try {
        const res = await fetch(`/api/payments/status/${transactionId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') {
            setStatus('success');
            clearInterval(poller);
            clearInterval(timer);
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
            }, 2000);
          } else if (data.status === 'failed' || data.status === 'expired') {
            setStatus(data.status);
            clearInterval(poller);
            clearInterval(timer);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(poller);
    };
  }, [isOpen, transactionId, onSuccess, onClose]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-lg">Pembayaran QRIS</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close modal">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center text-center">
          
          {status === 'success' && (
            <div className="flex flex-col items-center text-green-600 animate-in fade-in zoom-in">
              <CheckCircle className="w-16 h-16 mb-4" />
              <h4 className="text-xl font-bold">Pembayaran Berhasil!</h4>
              <p className="text-sm text-gray-500 mt-2">Menutup otomatis...</p>
            </div>
          )}

          {(status === 'failed' || status === 'expired') && (
             <div className="flex flex-col items-center text-red-600">
               <AlertCircle className="w-16 h-16 mb-4" />
               <h4 className="text-xl font-bold">Pembayaran Gagal</h4>
               <p className="text-sm text-gray-500 mt-2">
                 {status === 'expired' ? 'Waktu pembayaran habis.' : 'Terjadi kesalahan saat memproses.'}
               </p>
             </div>
          )}

          {status === 'pending' && (
            <>
              <div className="mb-4">
                <p className="text-gray-500 text-sm">Total Tagihan</p>
                <p className="text-2xl font-bold">{formatCurrency(amount)}</p>
              </div>

              <div className="bg-white p-4 border rounded-lg shadow-sm mb-4">
                <QRCodeSVG value={qrCodeUrl} size={200} />
              </div>

              <div className="text-sm text-gray-500 mb-4">
                Scan QR code di atas dengan aplikasi pembayaran Anda
              </div>

              <div className="flex items-center gap-2 text-orange-600 font-medium bg-orange-50 px-4 py-2 rounded-full">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Menunggu pembayaran... {formatTime(timeLeft)}</span>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
            {status !== 'success' && (
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
                >
                    Tutup
                </button>
            )}
            {(status === 'failed' || status === 'expired') && (
                <button 
                    onClick={() => {
                        // Retry not implemented yet (requires re-init)
                        // For now just close or maybe show toast
                        onClose();
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                    Tutup
                </button>
            )}
        </div>
      </div>
    </div>
  );
}
