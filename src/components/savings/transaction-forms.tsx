'use client';

import { useState } from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SavingsAccountOption {
  id: string;
  account_number: string;
  balance?: number;
  product?: {
    type?: string;
    min_balance?: number;
    min_deposit?: number;
    max_deposit?: number;
    is_withdrawal_allowed?: boolean;
    name?: string;
  } | null;
  member?: { nama_lengkap?: string | null } | null;
}

interface Props {
  accounts: SavingsAccountOption[];
}

const makeDepositSchema = (accounts: SavingsAccountOption[]) =>
  z.object({
    accountId: z.string().min(1, 'Pilih rekening'),
    amount: z.coerce.number().min(1, 'Jumlah minimal Rp 1'),
    description: z.string().optional(),
  }).superRefine((vals, ctx) => {
    const acc = accounts.find(a => a.id === vals.accountId);
    if (!acc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountId'],
        message: 'Rekening tidak ditemukan',
      });
      return;
    }
    const minDeposit = acc.product?.min_deposit ?? 0;
    if (vals.amount < minDeposit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: `Minimum setoran Rp ${new Intl.NumberFormat('id-ID').format(minDeposit)}`,
      });
    }
    const maxDeposit = acc.product?.max_deposit;
    if (typeof maxDeposit === 'number' && maxDeposit > 0 && vals.amount > maxDeposit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: `Maksimum setoran Rp ${new Intl.NumberFormat('id-ID').format(maxDeposit)}`,
      });
    }
  });

const makeWithdrawSchema = (accounts: SavingsAccountOption[]) =>
  z.object({
    accountId: z.string().min(1, 'Pilih rekening'),
    amount: z.coerce.number().min(1, 'Jumlah minimal Rp 1'),
    description: z.string().optional(),
  }).superRefine((vals, ctx) => {
    const acc = accounts.find(a => a.id === vals.accountId);
    if (!acc) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountId'],
        message: 'Rekening tidak ditemukan',
      });
      return;
    }
    const isAllowed = acc.product?.is_withdrawal_allowed ?? true;
    if (!isAllowed) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['accountId'],
        message: `Produk ${acc.product?.name || 'ini'} tidak boleh ditarik`,
      });
    }
    const minBalance = acc.product?.min_balance ?? 0;
    const balance = acc.balance ?? 0;
    const maxWithdraw = Math.max(0, balance - minBalance);
    if (vals.amount > maxWithdraw) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amount'],
        message: `Maks penarikan Rp ${new Intl.NumberFormat('id-ID').format(maxWithdraw)} (Saldo ${new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR'}).format(balance)} - saldo minimum Rp ${new Intl.NumberFormat('id-ID').format(minBalance)})`,
      });
    }
  });

export function SavingsTransactionForms({ accounts }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);

  const depositForm = useForm<z.infer<ReturnType<typeof makeDepositSchema>>>({
    resolver: zodResolver(makeDepositSchema(accounts)),
    defaultValues: {
      accountId: '',
      amount: 0,
      description: '',
    },
  });

  const withdrawForm = useForm<z.infer<ReturnType<typeof makeWithdrawSchema>>>({
    resolver: zodResolver(makeWithdrawSchema(accounts)),
    defaultValues: {
      accountId: '',
      amount: 0,
      description: '',
    },
  });

  async function submitTransaction(
    type: 'deposit' | 'withdrawal',
    accountId: string,
    amount: number,
    description?: string
  ) {
    try {
      const res = await fetch('/api/savings/transact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          amount,
          type,
          description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({
          title: 'Transaksi Gagal',
          description:
            data?.error?.details?.[0]?.message ||
            data?.error?.message ||
            data?.message ||
            'Terjadi kesalahan saat memproses transaksi.',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: 'Transaksi Berhasil',
        description: `Berhasil ${type === 'deposit' ? 'melakukan setoran' : 'melakukan penarikan'} simpanan.`,
      });
      router.refresh();
    } catch {
      toast({
        title: 'Transaksi Gagal',
        description: 'Tidak dapat terhubung ke server.',
        variant: 'destructive',
      });
    }
  }

  async function onSubmitDeposit(values: z.infer<ReturnType<typeof makeDepositSchema>>) {
    setLoadingDeposit(true);
    await submitTransaction('deposit', values.accountId, values.amount, values.description);
    setLoadingDeposit(false);
    depositForm.reset();
  }

  async function onSubmitWithdraw(values: z.infer<ReturnType<typeof makeWithdrawSchema>>) {
    setLoadingWithdraw(true);
    await submitTransaction('withdrawal', values.accountId, values.amount, values.description);
    setLoadingWithdraw(false);
    withdrawForm.reset();
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="p-6 bg-white rounded-lg border shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4 text-blue-600" />
          <h3 className="font-bold">Setoran</h3>
        </div>
        <Form {...depositForm}>
          <form onSubmit={depositForm.handleSubmit(onSubmitDeposit)} className="grid gap-3">
            <FormField
              control={depositForm.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rekening</FormLabel>
                  <Select
                    disabled={loadingDeposit}
                    onValueChange={(val) => field.onChange(val)}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih rekening" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.account_number} • {a.member?.nama_lengkap || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(() => {
              const selectedId = depositForm.watch('accountId');
              const acc = accounts.find(a => a.id === selectedId);
              if (!acc) return null;
              const minDeposit = acc.product?.min_deposit ?? 0;
              const maxDeposit = acc.product?.max_deposit;
              return (
                <div className="text-sm text-slate-600">
                  <span>
                    Minimum setoran: Rp {new Intl.NumberFormat('id-ID').format(minDeposit)}
                  </span>
                  {typeof maxDeposit === 'number' && maxDeposit > 0 && (
                    <span> • Maksimum setoran: Rp {new Intl.NumberFormat('id-ID').format(maxDeposit)}</span>
                  )}
                </div>
              );
            })()}
            <FormField
              control={depositForm.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah (Rp)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      disabled={loadingDeposit}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : '')
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={depositForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keterangan</FormLabel>
                  <FormControl>
                    <Input placeholder="Opsional" disabled={loadingDeposit} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={loadingDeposit}>
              {loadingDeposit ? 'Menyimpan...' : 'Simpan Setoran'}
            </Button>
          </form>
        </Form>
      </div>

      <div className="p-6 bg-white rounded-lg border shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ArrowDownLeft className="h-4 w-4 text-slate-700" />
          <h3 className="font-bold">Penarikan</h3>
        </div>
        <Form {...withdrawForm}>
          <form onSubmit={withdrawForm.handleSubmit(onSubmitWithdraw)} className="grid gap-3">
            <FormField
              control={withdrawForm.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rekening</FormLabel>
                  <Select
                    disabled={loadingWithdraw}
                    onValueChange={(val) => field.onChange(val)}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih rekening" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.account_number} • {a.member?.nama_lengkap || ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {(() => {
              const selectedId = withdrawForm.watch('accountId');
              const acc = accounts.find(a => a.id === selectedId);
              if (!acc) return null;
              const minBalance = acc.product?.min_balance ?? 0;
              const balance = acc.balance ?? 0;
              const maxWithdraw = Math.max(0, balance - minBalance);
              const allowed = acc.product?.is_withdrawal_allowed ?? true;
              return (
                <div className="text-sm text-slate-600">
                  {!allowed ? (
                    <span>Produk {acc.product?.name || ''} tidak mengizinkan penarikan.</span>
                  ) : (
                    <span>
                      Maks penarikan: {new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR'}).format(maxWithdraw)} • Saldo: {new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR'}).format(balance)} • Minimum saldo: Rp {new Intl.NumberFormat('id-ID').format(minBalance)}
                    </span>
                  )}
                </div>
              );
            })()}
            <FormField
              control={withdrawForm.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah (Rp)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      disabled={loadingWithdraw}
                      value={field.value ?? ''}
                      onChange={(e) =>
                        field.onChange(e.target.value ? Number(e.target.value) : '')
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={withdrawForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keterangan</FormLabel>
                  <FormControl>
                    <Input placeholder="Opsional" disabled={loadingWithdraw} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="secondary" disabled={loadingWithdraw}>
              {loadingWithdraw ? 'Menyimpan...' : 'Simpan Penarikan'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
