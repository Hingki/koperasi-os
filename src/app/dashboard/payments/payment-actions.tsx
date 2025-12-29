'use client';

import { useEffect, useState } from 'react';
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
import { createClient } from '@/lib/supabase/client';

interface Props {
  transactionId: string;
}

export function PaymentActions({ transactionId }: Props) {
  const [loading, setLoading] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const { toast } = useToast();
  const supabase = createClient();
  const [canAct, setCanAct] = useState(true);
  const [disabledReason, setDisabledReason] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes.user?.id;
        if (!userId) return;
        const { data: role } = await supabase
          .from('user_role')
          .select('koperasi_id, role')
          .eq('user_id', userId)
          .limit(1)
          .single();
        const kId = role?.koperasi_id;
        const roleOk = ['admin','bendahara','staff','teller'].includes(role?.role || '');
        if (!roleOk) {
          if (mounted) { setCanAct(false); setDisabledReason('Akses tidak mencukupi'); }
          return;
        }
        if (!kId) return;
        const today = new Date().toISOString().split('T')[0];
        const { data: period } = await supabase
          .from('accounting_periods')
          .select('is_closed')
          .eq('koperasi_id', kId)
          .lte('start_date', today)
          .gte('end_date', today)
          .limit(1)
          .single();
        const isClosed = !!period?.is_closed;
        if (mounted) {
          setCanAct(!isClosed);
          setDisabledReason(isClosed ? 'Periode terkunci' : null);
        }
      } catch {}
    })();
    return () => { mounted = false; };
  }, []);

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
        disabled={loading || !canAct}
        title={disabledReason || undefined}
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button 
        size="sm" 
        variant="destructive" 
        onClick={() => setRejectOpen(true)}
        disabled={loading || !canAct}
        title={disabledReason || undefined}
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
            <Button variant="destructive" onClick={onReject} disabled={loading || !rejectReason || !canAct} title={disabledReason || undefined}>
              Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
