import { createClient } from '@/lib/supabase/server';
// Utilities
import { RetailService } from '@/lib/services/retail-service';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DiscountStatusToggle from './status-toggle';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DiscountsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const retailService = new RetailService(supabase);
  const discounts = await retailService.getDiscounts(user.user_metadata.koperasi_id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Manajemen Diskon</h1>
          <p className="text-sm text-slate-500">
            Kelola diskon dan promosi penjualan
          </p>
        </div>
        <Link href="/dashboard/retail/discounts/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Diskon
          </Button>
        </Link>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Diskon</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Nilai</TableHead>
              <TableHead>Min. Pembelian</TableHead>
              <TableHead>Periode</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts && discounts.length > 0 ? (
              discounts.map((discount: any) => (
                <TableRow key={discount.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4 text-red-500" />
                    {discount.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {discount.type === 'percentage' ? 'Persentase' : 'Nominal Tetap'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-bold text-green-600">
                    {discount.type === 'percentage' 
                      ? `${discount.value}%` 
                      : `Rp ${discount.value.toLocaleString('id-ID')}`}
                  </TableCell>
                  <TableCell>
                    {discount.min_purchase_amount > 0 
                      ? `Rp ${discount.min_purchase_amount.toLocaleString('id-ID')}` 
                      : '-'}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {discount.start_date ? format(new Date(discount.start_date), 'dd/MM/yy', { locale: id }) : '-'} 
                    {' s/d '} 
                    {discount.end_date ? format(new Date(discount.end_date), 'dd/MM/yy', { locale: id }) : '-'}
                  </TableCell>
                  <TableCell>
                    <DiscountStatusToggle id={discount.id} isActive={discount.is_active} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Belum ada diskon aktif.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
