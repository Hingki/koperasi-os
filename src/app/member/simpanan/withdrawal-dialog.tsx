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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { requestWithdrawal } from '@/lib/actions/member-savings';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Wallet } from 'lucide-react';

interface Account {
  id: string;
  account_number: string;
  balance: number;
  product: {
    name: string;
    is_withdrawal_allowed?: boolean;
  };
}

export function WithdrawalDialog({ accounts }: { accounts: Account[] }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Filter accounts that allow withdrawal
  const withdrawableAccounts = accounts.filter(acc => acc.product.is_withdrawal_allowed !== false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    
    const formData = new FormData(event.currentTarget);
    const result = await requestWithdrawal(formData);

    setLoading(false);

    if (result?.error) {
      let errorMsg = 'Terjadi kesalahan';
      if (typeof result.error === 'string') {
        errorMsg = result.error;
      } else if (typeof result.error === 'object') {
        // Grab the first error message found
        const firstKey = Object.keys(result.error)[0];
        if (firstKey && Array.isArray(result.error[firstKey])) {
           errorMsg = result.error[firstKey][0];
        }
      }

      toast({
        title: 'Gagal',
        description: errorMsg,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Berhasil',
        description: 'Permohonan penarikan telah dikirim.',
      });
      setOpen(false);
    }
  }

  if (withdrawableAccounts.length === 0) {
      return null; // Or show disabled button
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
            <Wallet className="mr-2 h-4 w-4" />
            Tarik Saldo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Tarik Saldo Simpanan</DialogTitle>
          <DialogDescription>
            Ajukan permohonan penarikan saldo ke rekening bank anda. Proses persetujuan membutuhkan waktu 1x24 jam.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="account_id">Pilih Rekening Asal</Label>
            <Select name="account_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Pilih rekening simpanan" />
              </SelectTrigger>
              <SelectContent>
                {withdrawableAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.product.name} - {formatCurrency(acc.balance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
             <Label htmlFor="amount">Jumlah Penarikan (Rp)</Label>
             <Input id="amount" name="amount" type="number" min="10000" placeholder="Minimal 10.000" required />
          </div>

          <div className="border-t pt-4 mt-2">
             <h4 className="text-sm font-medium mb-3">Rekening Tujuan Transfer</h4>
             <div className="grid gap-3">
                <div className="grid gap-2">
                    <Label htmlFor="bank_name">Nama Bank</Label>
                    <Input id="bank_name" name="bank_name" placeholder="Contoh: BRI, BCA, Mandiri" required />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="account_number">Nomor Rekening</Label>
                    <Input id="account_number" name="account_number" placeholder="Nomor rekening anda" required />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="account_holder">Nama Pemilik Rekening</Label>
                    <Input id="account_holder" name="account_holder" placeholder="Nama sesuai buku tabungan" required />
                </div>
             </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kirim Permohonan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
