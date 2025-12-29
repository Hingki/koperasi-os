'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';

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
        message: `Maks penarikan Rp ${new Intl.NumberFormat('id-ID').format(maxWithdraw)} (Saldo ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(balance)} - saldo minimum Rp ${new Intl.NumberFormat('id-ID').format(minBalance)})`,
      });
    }
  });

export function SavingsTransactionForms({ accounts }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [loadingDeposit, setLoadingDeposit] = useState(false);
  const [loadingWithdraw, setLoadingWithdraw] = useState(false);
  const [depositCanAct, setDepositCanAct] = useState(false);
  const [depositReason, setDepositReason] = useState<string>('');
  const [withdrawCanAct, setWithdrawCanAct] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTx, setPendingTx] = useState<{
    type: 'deposit' | 'withdrawal';
    accountId: string;
    amount: number;
    description?: string;
  } | null>(null);
  const supabase = createClient();

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

  const depositSelectedId = depositForm.watch('accountId');
  const withdrawSelectedId = withdrawForm.watch('accountId');

  async function checkState(accountId: string, type: 'deposit' | 'withdrawal') {
    if (!accountId) {
      if (type === 'deposit') {
        setDepositCanAct(false);
        setDepositReason('Pilih rekening terlebih dahulu');
      } else {
        setWithdrawCanAct(false);
        setWithdrawReason('Pilih rekening terlebih dahulu');
      }
      return;
    }

    const { data: acc } = await supabase
      .from('savings_accounts')
      .select('id, koperasi_id, status, product:savings_products(name, type, is_withdrawal_allowed, min_balance, min_deposit, max_deposit)')
      .eq('id', accountId)
      .single();

    if (!acc) {
      if (type === 'deposit') {
        setDepositCanAct(false);
        setDepositReason('Rekening tidak ditemukan');
      } else {
        setWithdrawCanAct(false);
        setWithdrawReason('Rekening tidak ditemukan');
      }
      return;
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user?.user) {
      if (type === 'deposit') {
        setDepositCanAct(false);
        setDepositReason('Tidak terautentik');
      } else {
        setWithdrawCanAct(false);
        setWithdrawReason('Tidak terautentik');
      }
      return;
    }

    const { data: roles } = await supabase
      .from('user_role')
      .select('role')
      .eq('user_id', user.user.id)
      .eq('koperasi_id', acc.koperasi_id)
      .eq('is_active', true);

    const allowedRoles = ['admin', 'pengurus', 'ketua', 'bendahara', 'staff'];
    const hasAllowed = (roles || []).some((r: any) => allowedRoles.includes(r.role));
    if (!hasAllowed) {
      if (type === 'deposit') {
        setDepositCanAct(false);
        setDepositReason('Role tidak sah untuk aksi finansial');
      } else {
        setWithdrawCanAct(false);
        setWithdrawReason('Role tidak sah untuk aksi finansial');
      }
      return;
    }

    const today = new Date().toISOString();
    const { data: period } = await supabase
      .from('accounting_period')
      .select('id, status, start_date, end_date')
      .eq('koperasi_id', acc.koperasi_id)
      .eq('status', 'open')
      .lte('start_date', today)
      .gte('end_date', today)
      .limit(1)
      .maybeSingle();

    if (!period) {
      if (type === 'deposit') {
        setDepositCanAct(false);
        setDepositReason('Periode akuntansi terkunci atau tidak terbuka');
      } else {
        setWithdrawCanAct(false);
        setWithdrawReason('Periode akuntansi terkunci atau tidak terbuka');
      }
      return;
    }

    const prod = Array.isArray(acc.product) ? acc.product[0] : acc.product;
    if (type === 'withdrawal' && prod && prod.is_withdrawal_allowed === false) {
      setWithdrawCanAct(false);
      setWithdrawReason('Produk tidak mengizinkan penarikan');
      return;
    }

    if (type === 'deposit') {
      setDepositCanAct(true);
      setDepositReason('');
    } else {
      setWithdrawCanAct(true);
      setWithdrawReason('');
    }
  }

  useEffect(() => {
    checkState(depositSelectedId, 'deposit');
  }, [depositSelectedId]);

  useEffect(() => {
    checkState(withdrawSelectedId, 'withdrawal');
  }, [withdrawSelectedId]);

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
    setPendingTx({
      type: 'deposit',
      accountId: values.accountId,
      amount: values.amount,
      description: values.description,
    });
    setConfirmOpen(true);
  }

  async function onSubmitWithdraw(values: z.infer<ReturnType<typeof makeWithdrawSchema>>) {
    setPendingTx({
      type: 'withdrawal',
      accountId: values.accountId,
      amount: values.amount,
      description: values.description,
    });
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!pendingTx) return;
    setConfirmOpen(false);

    if (pendingTx.type === 'deposit') {
      setLoadingDeposit(true);
      await submitTransaction('deposit', pendingTx.accountId, pendingTx.amount, pendingTx.description);
      setLoadingDeposit(false);
      depositForm.reset();
    } else {
      setLoadingWithdraw(true);
      await submitTransaction('withdrawal', pendingTx.accountId, pendingTx.amount, pendingTx.description);
      setLoadingWithdraw(false);
      withdrawForm.reset();
    }
    setPendingTx(null);
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="p-6 bg-white rounded-lg border shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4 text-red-600" />
          <h3 className="font-bold">Setoran</h3>
        </div>
        <p className="text-sm text-slate-500">
          Setoran menambah saldo simpanan anggota. Dana masuk ke Kas.
        </p>
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
                          <span className="font-medium text-slate-900">{a.account_number}</span>
                          <span className="mx-2 text-slate-300">•</span>
                          <span className="text-slate-700">{a.member?.nama_lengkap || '-'}</span>
                          <span className="mx-2 text-slate-300">•</span>
                          <span className="text-xs text-slate-500 uppercase font-semibold">{a.product?.name || 'Simpanan'}</span>
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
            {(() => {
              const selectedId = depositForm.watch('accountId');
              const acc = accounts.find(a => a.id === selectedId);
              const amount = depositForm.watch('amount');
              if (!acc || !amount || amount <= 0) return null;
              return (
                <div className="rounded-md border p-3 text-sm bg-slate-50">
                  <div className="font-medium text-slate-700">Dampak Akuntansi</div>
                  <div>
                    Dr Kas {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)} • Cr Simpanan {acc.product?.name || ''}
                  </div>
                </div>
              );
            })()}
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
            <Button type="submit" disabled={loadingDeposit || !depositCanAct} title={depositReason || undefined}>
              {loadingDeposit ? 'Menyimpan...' : depositCanAct ? 'Simpan Setoran' : (depositReason || 'Tidak dapat melakukan aksi')}
            </Button>
          </form>
        </Form>
      </div>

      <div className="p-6 bg-white rounded-lg border shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ArrowDownLeft className="h-4 w-4 text-slate-700" />
          <h3 className="font-bold">Penarikan</h3>
        </div>
        <p className="text-sm text-slate-500">
          Penarikan mengurangi saldo simpanan anggota. Dana keluar dari Kas.
        </p>
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
                          <span className="font-medium text-slate-900">{a.account_number}</span>
                          <span className="mx-2 text-slate-300">•</span>
                          <span className="text-slate-700">{a.member?.nama_lengkap || '-'}</span>
                          <span className="mx-2 text-slate-300">•</span>
                          <span className="text-xs text-slate-500 uppercase font-semibold">{a.product?.name || 'Simpanan'}</span>
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
                      Maks penarikan: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(maxWithdraw)} • Saldo: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(balance)} • Minimum saldo: Rp {new Intl.NumberFormat('id-ID').format(minBalance)}
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
            {(() => {
              const selectedId = withdrawForm.watch('accountId');
              const acc = accounts.find(a => a.id === selectedId);
              const amount = withdrawForm.watch('amount');
              if (!acc || !amount || amount <= 0) return null;
              return (
                <div className="rounded-md border p-3 text-sm bg-slate-50">
                  <div className="font-medium text-slate-700">Dampak Akuntansi</div>
                  <div>
                    Dr Simpanan {acc.product?.name || ''} {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)} • Cr Kas
                  </div>
                </div>
              );
            })()}
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
            <Button type="submit" variant="secondary" disabled={loadingWithdraw || !withdrawCanAct} title={withdrawReason || undefined}>
              {loadingWithdraw ? 'Menyimpan...' : withdrawCanAct ? 'Simpan Penarikan' : (withdrawReason || 'Tidak dapat melakukan aksi')}
            </Button>
          </form>
        </Form>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Transaksi</DialogTitle>
            <DialogDescription>
              Mohon periksa kembali detail transaksi sebelum melanjutkan.
            </DialogDescription>
          </DialogHeader>
          {pendingTx && (
            <div className="py-4 space-y-3 bg-slate-50 p-4 rounded-md">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Jenis Transaksi</span>
                <span className={`font-bold ${pendingTx.type === 'deposit' ? 'text-green-600' : 'text-amber-600'}`}>
                  {pendingTx.type === 'deposit' ? 'SETORAN TUNAI' : 'PENARIKAN TUNAI'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Rekening</span>
                <span className="font-medium text-right">
                  {accounts.find(a => a.id === pendingTx.accountId)?.account_number}
                  <br />
                  <span className="text-xs font-normal text-slate-500">
                    {accounts.find(a => a.id === pendingTx.accountId)?.member?.nama_lengkap}
                  </span>
                </span>
              </div>
              <div className="flex justify-between text-sm items-center border-t pt-2 mt-2">
                <span className="text-slate-500">Jumlah</span>
                <span className="font-bold text-lg">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(pendingTx.amount)}
                </span>
              </div>
              {pendingTx.description && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Keterangan</span>
                  <span className="font-medium text-right max-w-[200px] truncate">{pendingTx.description}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loadingDeposit || loadingWithdraw}>Batal</Button>
            <Button
              variant={pendingTx?.type === 'deposit' ? 'default' : 'secondary'}
              onClick={handleConfirm}
              disabled={loadingDeposit || loadingWithdraw}
              className={pendingTx?.type === 'deposit' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {(loadingDeposit || loadingWithdraw) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Konfirmasi {pendingTx?.type === 'deposit' ? 'Setoran' : 'Penarikan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
