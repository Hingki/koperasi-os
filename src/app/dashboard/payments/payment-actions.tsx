'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { approvePayment, rejectPayment } from '@/lib/actions/payment-approval';
import { Check, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface Props {
  transactionId: string;
}

export function PaymentActions({ transactionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const { toast } = useToast();

  async function onApprove() {
    if (!confirm('Apakah anda yakin menyetujui pembayaran ini?')) return;
    setLoading(true);
    try {
      const res = await approvePayment(transactionId) as { success: boolean; error?: string };
      if (res.success) {
        toast({ title: 'Berhasil', description: 'Pembayaran disetujui.' });
      } else {
        toast({ title: 'Gagal', description: res.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Terjadi kesalahan sistem', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function onReject() {
    setLoading(true);
    try {
      const res = await rejectPayment(transactionId, rejectReason) as { success: boolean; error?: string };
      if (res.success) {
        toast({ title: 'Berhasil', description: 'Pembayaran ditolak.' });
        setRejectOpen(false);
      } else {
        toast({ title: 'Gagal', description: res.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Terjadi kesalahan sistem', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-2">
      <Button 
        size="sm" 
        className="bg-emerald-600 hover:bg-emerald-700" 
        onClick={onApprove}
        disabled={loading}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button 
        size="sm" 
        variant="destructive" 
        onClick={() => setRejectOpen(true)}
        disabled={loading}
      >
        <X className="h-4 w-4" />
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pembayaran</DialogTitle>
            <DialogDescription>
              Masukkan alasan penolakan pembayaran ini.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              value={rejectReason} 
              onChange={(e) => setRejectReason(e.target.value)} 
              placeholder="Alasan penolakan..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={onReject} disabled={loading || !rejectReason}>
              Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
