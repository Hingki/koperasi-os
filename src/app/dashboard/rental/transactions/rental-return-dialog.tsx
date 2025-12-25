'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { returnRentalTransactionAction } from '@/lib/actions/rental';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { differenceInHours, differenceInDays } from 'date-fns';

interface RentalReturnDialogProps {
  transactionId: string;
  expectedReturnDate: string;
  depositAmount: number;
}

export function RentalReturnDialog({ transactionId, expectedReturnDate, depositAmount }: RentalReturnDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().slice(0, 16));
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [refundDeposit, setRefundDeposit] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');

  // Calculate suggested fine based on lateness
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setReturnDate(val);
    
    // Simple logic: if late, suggest fine? 
    // This is business logic specific, let's just leave it manual for now or basic suggestion.
    const actual = new Date(val);
    const expected = new Date(expectedReturnDate);
    
    if (actual > expected) {
        // Late
        const hoursLate = differenceInHours(actual, expected);
        // Maybe suggest fine? 
        // For now, let user input manually.
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await returnRentalTransactionAction(
        transactionId,
        new Date(returnDate),
        fineAmount,
        notes,
        refundDeposit
      );

      if (result.success) {
        toast.success('Pengembalian berhasil diproses');
        setOpen(false);
        router.refresh();
      } else {
        toast.error('Gagal memproses pengembalian: ' + result.error);
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700">
          Proses Pengembalian
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Pengembalian Unit</DialogTitle>
          <DialogDescription>
            Proses pengembalian unit, hitung denda, dan kembalikan deposit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="returnDate">Tanggal Pengembalian Aktual</Label>
            <Input 
                id="returnDate" 
                type="datetime-local" 
                value={returnDate}
                onChange={handleDateChange}
                required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fineAmount">Denda (Keterlambatan / Kerusakan)</Label>
            <Input 
                id="fineAmount" 
                type="number" 
                min="0"
                value={fineAmount}
                onChange={e => setFineAmount(Number(e.target.value))}
            />
          </div>

          {depositAmount > 0 && (
             <div className="flex items-center space-x-2 border p-3 rounded-md bg-slate-50">
                <Checkbox 
                    id="refundDeposit" 
                    checked={refundDeposit}
                    onCheckedChange={(c: boolean | 'indeterminate') => setRefundDeposit(!!c)}
                />
                <div className="grid gap-1.5 leading-none">
                    <Label htmlFor="refundDeposit" className="font-medium cursor-pointer">
                        Kembalikan Deposit (Rp {depositAmount.toLocaleString()})
                    </Label>
                    <p className="text-xs text-muted-foreground">
                        {refundDeposit 
                            ? `Sistem akan mencatat pengeluaran kas sebesar Rp ${(depositAmount - fineAmount).toLocaleString()} (setelah dikurangi denda)` 
                            : 'Deposit tidak dikembalikan (menjadi pendapatan)'}
                    </p>
                </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="notes">Catatan Kondisi / Keterangan</Label>
            <Textarea 
                id="notes" 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Kondisi barang saat kembali..."
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
