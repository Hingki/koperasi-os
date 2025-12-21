'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { submitMemberLoanApplication } from '@/lib/actions/loan';
import { formatCurrency } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// Schema
const formSchema = z.object({
  product_id: z.string().min(1, 'Pilih produk pinjaman'),
  amount: z.coerce.number().min(10000, 'Jumlah minimal Rp 10.000'),
  tenor_months: z.coerce.number().min(1, 'Tenor minimal 1 bulan'),
  purpose: z.string().min(5, 'Tujuan penggunaan wajib diisi'),
});

interface Product {
  id: string;
  name: string;
  interest_rate: number;
  max_amount: number;
  max_duration_months: number;
}

interface MemberLoanApplicationFormProps {
  products: Product[];
}

export function MemberLoanApplicationForm({ products }: MemberLoanApplicationFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      tenor_months: 0,
      purpose: '',
    },
  });

  const watchAmount = form.watch('amount');
  const watchTenor = form.watch('tenor_months');

  // Calculate estimation
  const monthlyInstallment = selectedProduct && watchAmount && watchTenor 
    ? (watchAmount + (watchAmount * (selectedProduct.interest_rate / 100) * (watchTenor / 12))) / watchTenor
    : 0;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('product_id', values.product_id);
      formData.append('amount', values.amount.toString());
      formData.append('tenor_months', values.tenor_months.toString());
      formData.append('purpose', values.purpose);

      const result = await submitMemberLoanApplication(formData);

      if (result.success) {
        toast.success('Pengajuan pinjaman berhasil dikirim');
        router.push('/member/pinjaman');
        router.refresh();
      } else {
        toast.error(result.error || 'Gagal mengirim pengajuan');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="product_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Produk Pinjaman</FormLabel>
              <Select 
                onValueChange={(val) => {
                  field.onChange(val);
                  const prod = products.find(p => p.id === val) || null;
                  setSelectedProduct(prod);
                  // Reset validation limits if needed, or rely on schema/server
                }} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis pinjaman" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Bunga {product.interest_rate}% p.a)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProduct && (
                <FormDescription>
                  Maksimal pinjaman: {formatCurrency(selectedProduct.max_amount)}. 
                  Maksimal tenor: {selectedProduct.max_duration_months} bulan.
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jumlah Pengajuan (Rp)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Contoh: 5000000" 
                    {...field} 
                    onChange={e => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="tenor_months"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tenor (Bulan)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="Contoh: 12" 
                    {...field} 
                    onChange={e => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {selectedProduct && watchAmount > 0 && watchTenor > 0 && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-700 mb-2">Estimasi Angsuran</h4>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Angsuran per bulan:</span>
              <span className="text-lg font-bold text-emerald-600">
                {formatCurrency(monthlyInstallment)}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              *Estimasi ini belum termasuk biaya admin atau provisi jika ada.
            </p>
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
                  placeholder="Jelaskan tujuan penggunaan dana pinjaman..." 
                  className="resize-none" 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mengirim...
            </>
          ) : (
            'Ajukan Pinjaman'
          )}
        </Button>
      </form>
    </Form>
  );
}
