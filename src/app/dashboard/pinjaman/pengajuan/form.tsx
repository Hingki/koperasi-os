'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../../../../components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../../../../components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select';
import { Input } from '../../../../components/ui/input';
import { Textarea } from '../../../../components/ui/textarea';
import { useToast } from '../../../../components/ui/use-toast';
import { applyForLoan } from '../../../../lib/actions/loan';
import { LoanType } from '../../../../lib/services/loan-service';
import { formatCurrency } from '../../../../lib/utils';
import { Loader2, Calculator } from 'lucide-react';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  loan_type_id: z.string({ required_error: "Pilih jenis pinjaman" }),
  amount: z.coerce.number()
    .min(100000, "Minimal pinjaman Rp 100.000")
    .max(1000000000, "Maksimal pinjaman Rp 1.000.000.000"),
  purpose: z.string().min(10, "Tujuan penggunaan minimal 10 karakter"),
});

export function LoanApplicationForm({ loanTypes }: { loanTypes: LoanType[] }) {
  const { toast } = useToast();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<LoanType | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      purpose: "",
    },
  });

  const watchAmount = form.watch("amount");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      // Validate max amount against loan type limit
      if (selectedType && values.amount > selectedType.max_amount) {
        form.setError("amount", {
          type: "max",
          message: `Maksimal untuk jenis ini adalah ${formatCurrency(selectedType.max_amount)}`
        });
        return;
      }

      const result = await applyForLoan(values);

      if (result.success) {
        toast({
          title: "Pengajuan Terkirim",
          description: "Pengajuan pinjaman Anda telah berhasil dikirim untuk ditinjau.",
          className: "bg-green-600 text-white border-0"
        });
        router.push('/dashboard/pinjaman');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Gagal Mengajukan",
        description: error.message,
        variant: "destructive",
      });
    }
  }

  // Simulation Calculation
  const simulation = selectedType && watchAmount > 0 ? (() => {
    const ratePerMonth = selectedType.interest_rate / 12 / 100;
    const principal = watchAmount / selectedType.tenor_months;
    const interest = watchAmount * ratePerMonth;
    return {
      principal,
      interest,
      total: principal + interest
    };
  })() : null;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        <FormField
          control={form.control}
          name="loan_type_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jenis Pinjaman</FormLabel>
              <Select
                disabled={form.formState.isSubmitting}
                onValueChange={(val) => {
                  field.onChange(val);
                  setSelectedType(loanTypes.find(t => t.id === val) || null);
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis pinjaman" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {loanTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} (Bunga {type.interest_rate}% p.a)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <FormDescription className="text-xs bg-red-50 p-2 rounded text-red-700 mt-2">
                  Max: {formatCurrency(selectedType.max_amount)} • Tenor: {selectedType.tenor_months} Bulan • Biaya Admin: {formatCurrency(selectedType.admin_fee)}
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Jumlah Pengajuan (Rp)</FormLabel>
              <FormControl>
                <Input
                  disabled={form.formState.isSubmitting}
                  type="number"
                  placeholder="Contoh: 5000000"
                  {...field}
                />
              </FormControl>
              {selectedType && field.value > 0 && (
                <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                  <div className="flex justify-between font-medium">
                    <span>Estimasi Dana Diterima:</span>
                    <span className="text-green-700">
                      {formatCurrency(Math.max(0, field.value - selectedType.admin_fee))}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    *Biaya admin {formatCurrency(selectedType.admin_fee)} dipotong saat pencairan.
                  </p>
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {simulation && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Simulasi Angsuran Bulanan
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Pokok</span>
                <span>{formatCurrency(simulation.principal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bunga</span>
                <span>{formatCurrency(simulation.interest)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold text-slate-900">
                <span>Total per Bulan</span>
                <span>{formatCurrency(simulation.total)}</span>
              </div>
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="purpose"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tujuan Penggunaan</FormLabel>
              <FormControl>
                <Textarea
                  disabled={form.formState.isSubmitting}
                  placeholder="Jelaskan tujuan penggunaan dana pinjaman..."
                  className="resize-none min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-4">
          <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Mengirim Pengajuan...
              </>
            ) : (
              'Kirim Pengajuan'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
