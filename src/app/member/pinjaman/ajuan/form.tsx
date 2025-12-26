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
import { useToast } from '@/components/ui/use-toast';
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
  interest_type: string;
  max_amount: number;
  min_amount: number;
  max_tenor_months: number;
  admin_fee: number;
  provision_fee: number;
}

interface MemberLoanApplicationFormProps {
  products: Product[];
}

export function MemberLoanApplicationForm({ products }: MemberLoanApplicationFormProps) {
  const router = useRouter();
  const { toast } = useToast();
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
    
  const adminFee = selectedProduct?.admin_fee || 0;
  const provisionFee = selectedProduct ? (watchAmount * (selectedProduct.provision_fee / 100)) : 0;
  const totalDeduction = adminFee + provisionFee;
  const receivedAmount = watchAmount - totalDeduction;

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
        toast({
          title: "Berhasil",
          description: "Pengajuan pinjaman berhasil dikirim",
          variant: "default",
        });
        router.push('/member/pinjaman');
        router.refresh();
      } else {
        toast({
          title: "Gagal",
          description: result.error || 'Gagal mengirim pengajuan',
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan sistem",
        variant: "destructive",
      });
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
                  
                  if (prod) {
                    if (form.getValues('amount') > prod.max_amount) {
                      form.setValue('amount', prod.max_amount);
                    }
                    if (form.getValues('tenor_months') > prod.max_tenor_months) {
                      form.setValue('tenor_months', prod.max_tenor_months);
                    }
                  }
                }} 
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih produk pinjaman" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Bunga {product.interest_rate}% / thn)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProduct && (
                <FormDescription>
                  <div className="mt-2 text-xs space-y-1 text-slate-600 bg-slate-50 p-2 rounded">
                    <p>Limit: {formatCurrency(selectedProduct.min_amount)} - {formatCurrency(selectedProduct.max_amount)}</p>
                    <p>Tenor Max: {selectedProduct.max_tenor_months} bulan</p>
                    <p>Jenis Bunga: {selectedProduct.interest_type}</p>
                  </div>
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

        {selectedProduct && (
          <div className="rounded-lg bg-slate-50 p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Jumlah Pinjaman:</span>
              <span className="font-medium">{formatCurrency(watchAmount || 0)}</span>
            </div>
            <div className="flex justify-between text-amber-700">
              <span>Biaya Admin & Provisi:</span>
              <span>- {formatCurrency(totalDeduction)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 border-t pt-2">
              <span>Dana Diterima Bersih:</span>
              <span>{formatCurrency(receivedAmount)}</span>
            </div>
            <div className="flex justify-between text-teal-700 border-t pt-2 mt-2">
              <span>Estimasi Angsuran / Bulan:</span>
              <span className="font-bold">{formatCurrency(monthlyInstallment)}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              *Simulasi perhitungan. Nilai realisasi mungkin berbeda tergantung tanggal pencairan.
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

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Mengirim...
            </>
          ) : (
            'Kirim Pengajuan'
          )}
        </Button>
      </form>
    </Form>
  );
}
