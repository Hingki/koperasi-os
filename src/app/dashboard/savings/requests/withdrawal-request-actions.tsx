
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { approveWithdrawalRequest, rejectWithdrawalRequest } from '@/lib/actions/admin-savings';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Props {
  requestId: string;
  memberName: string;
  amount: number;
}

export function WithdrawalRequestActions({ requestId, memberName, amount }: Props) {
  const [openApprove, setOpenApprove] = useState(false);
  const [openReject, setOpenReject] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const { toast } = useToast();

  const handleApprove = async () => {
    setLoading(true);
    const result = await approveWithdrawalRequest(requestId, note);
    setLoading(false);

    if (result.success) {
      toast({ title: 'Berhasil', description: 'Permohonan disetujui & saldo dipotong.' });
      setOpenApprove(false);
    } else {
      toast({ variant: 'destructive', title: 'Gagal', description: result.error });
    }
  };

  const handleReject = async () => {
    setLoading(true);
    const result = await rejectWithdrawalRequest(requestId, note);
    setLoading(false);

    if (result.success) {
      toast({ title: 'Berhasil', description: 'Permohonan ditolak.' });
      setOpenReject(false);
    } else {
      toast({ variant: 'destructive', title: 'Gagal', description: result.error });
    }
  };

  return (
    <div className="flex space-x-2">
      {/* Approve Dialog */}
      <Dialog open={openApprove} onOpenChange={setOpenApprove}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
            <CheckCircle className="w-4 h-4 mr-1" /> Approve
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setujui Penarikan?</DialogTitle>
            <DialogDescription>
              Akan memotong saldo {memberName} sebesar <b>Rp {amount.toLocaleString('id-ID')}</b>.
              Pastikan anda sudah melakukan transfer ke rekening tujuan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Catatan Admin (Opsional)</Label>
            <Textarea 
                placeholder="Misal: Transfer berhasil via KlikBCA..." 
                value={note}
                onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenApprove(false)}>Batal</Button>
            <Button onClick={handleApprove} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Konfirmasi Setuju
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={openReject} onOpenChange={setOpenReject}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            <XCircle className="w-4 h-4 mr-1" /> Reject
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Penarikan?</DialogTitle>
            <DialogDescription>
              Saldo anggota tidak akan dipotong. Berikan alasan penolakan.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Alasan Penolakan (Wajib)</Label>
            <Textarea 
                placeholder="Misal: Nomor rekening tidak valid..." 
                value={note}
                onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReject(false)}>Batal</Button>
            <Button onClick={handleReject} disabled={loading || !note} variant="destructive">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tolak Permohonan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
