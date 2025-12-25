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
import { payPurchaseDebtAction } from '@/lib/actions/retail';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface DebtPaymentDialogProps {
  purchase: any;
}

export function DebtPaymentDialog({ purchase }: DebtPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const { toast } = useToast();

  const handlePayment = async () => {
    setLoading(true);
    try {
      await payPurchaseDebtAction({
        purchase_id: purchase.id,
        amount: purchase.total_amount, // Full payment only for now
        payment_method: paymentMethod,
      });

      toast({
        title: 'Pembayaran Berhasil',
        description: `Utang pembelian ${purchase.invoice_number} telah dilunasi.`,
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: 'Gagal Membayar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Bayar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bayar Utang Pembelian</DialogTitle>
          <DialogDescription>
            Konfirmasi pembayaran untuk faktur {purchase.invoice_number}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Supplier</Label>
            <div className="col-span-3 font-medium">{purchase.supplier?.name}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Total Tagihan</Label>
            <div className="col-span-3 font-bold text-lg">{formatCurrency(purchase.total_amount)}</div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="method" className="text-right">Metode Bayar</Label>
            <Select value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Pilih metode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Tunai (Kas)</SelectItem>
                <SelectItem value="transfer">Transfer (Bank)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Batal</Button>
          <Button onClick={handlePayment} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Bayar Lunas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}