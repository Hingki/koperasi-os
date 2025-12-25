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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createMemberPayment } from '@/lib/actions/member-payment';
import { formatCurrency } from '@/lib/utils';
import { PlusCircle } from 'lucide-react';

interface Props {
  savingsAccounts: any[];
  loans: any[];
  paymentSources: any[];
}

export function CreatePaymentDialog({ savingsAccounts, loans, paymentSources }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [type, setType] = useState<'savings_deposit' | 'loan_payment'>('savings_deposit');
  const [referenceId, setReferenceId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentSourceId, setPaymentSourceId] = useState<string>('');
  const [senderInfo, setSenderInfo] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);

  const selectedSource = paymentSources.find(s => s.id === paymentSourceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!referenceId || !amount || !paymentSourceId || !senderInfo) {
      toast({ title: 'Error', description: 'Mohon lengkapi semua field', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const fd = new FormData();
    fd.set('type', type);
    fd.set('referenceId', referenceId);
    fd.set('amount', amount);
    fd.set('paymentSourceId', paymentSourceId);
    fd.set('senderInfo', senderInfo);
    if (notes) fd.set('notes', notes);
    if (file) fd.set('proof', file);

    try {
      const res = await createMemberPayment(fd);
      if (res.success) {
        toast({ title: 'Berhasil', description: 'Pembayaran berhasil dibuat dan menunggu konfirmasi.' });
        setOpen(false);
        resetForm();
      } else {
        toast({ title: 'Gagal', description: res.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Terjadi kesalahan sistem', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setType('savings_deposit');
    setReferenceId('');
    setAmount('');
    setPaymentSourceId('');
    setSenderInfo('');
    setNotes('');
    setFile(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <PlusCircle className="mr-2 h-4 w-4" />
          Pembayaran Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Buat Pembayaran Baru</DialogTitle>
            <DialogDescription>
              Lakukan pembayaran simpanan atau angsuran pinjaman.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Tipe</Label>
              <Select 
                value={type} 
                onValueChange={(v: any) => {
                  setType(v);
                  setReferenceId('');
                }}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="savings_deposit">Setor Simpanan</SelectItem>
                  <SelectItem value="loan_payment">Bayar Angsuran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                {type === 'savings_deposit' ? 'Rekening' : 'Pinjaman'}
              </Label>
              <Select value={referenceId} onValueChange={setReferenceId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih..." />
                </SelectTrigger>
                <SelectContent>
                  {type === 'savings_deposit' ? (
                    savingsAccounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.product.name} - {acc.account_number}
                      </SelectItem>
                    ))
                  ) : (
                    loans.map(loan => (
                      <SelectItem key={loan.id} value={loan.id}>
                        Pinjaman {formatCurrency(loan.principal_amount)} ({loan.status})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Nominal</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="col-span-3"
                placeholder="0"
                min="1000"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Metode</Label>
              <Select value={paymentSourceId} onValueChange={setPaymentSourceId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Pilih Metode Bayar" />
                </SelectTrigger>
                <SelectContent>
                  {paymentSources.map(src => (
                    <SelectItem key={src.id} value={src.id}>
                      {src.name} ({src.method})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSource && selectedSource.method === 'transfer' && (
              <div className="col-span-4 bg-slate-50 p-3 rounded-md border text-sm space-y-1">
                <p className="font-semibold text-slate-700">Silakan transfer ke:</p>
                <p>Bank: {selectedSource.bank_name}</p>
                <p>No. Rek: {selectedSource.account_number}</p>
                <p>A.N: {selectedSource.account_holder}</p>
              </div>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Info Pengirim</Label>
              <Input
                value={senderInfo}
                onChange={(e) => setSenderInfo(e.target.value)}
                className="col-span-3"
                placeholder="Nama Pengirim / No Ref"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Bukti Transfer</Label>
              <Input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="col-span-3"
                accept="image/*,application/pdf"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Catatan</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="col-span-3"
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Memproses...' : 'Kirim Pembayaran'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
