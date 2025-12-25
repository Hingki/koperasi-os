import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function SoldItemsReportPage({ searchParams }: { searchParams: { start?: string, end?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const startDate = searchParams.start ? parseISO(searchParams.start) : startOfMonth(new Date());
  const endDate = searchParams.end ? parseISO(searchParams.end) : endOfMonth(new Date());

  const retailService = new RetailService(supabase);
  const items = await retailService.getSoldItemsReport(
    user.user_metadata.koperasi_id,
    startDate,
    endDate
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Laporan Barang Terjual</h1>
          <p className="text-sm text-slate-500">
            Periode: {format(startDate, 'dd MMMM yyyy', { locale: id })} - {format(endDate, 'dd MMMM yyyy', { locale: id })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`?start=${new Date().toISOString()}&end=${new Date().toISOString()}`}>
            <Button variant="outline" size="sm">Hari Ini</Button>
          </Link>
          <Link href={`?start=${startOfMonth(new Date()).toISOString()}&end=${endOfMonth(new Date()).toISOString()}`}>
            <Button variant="outline" size="sm">Bulan Ini</Button>
          </Link>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Barang</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Qty Terjual</TableHead>
              <TableHead className="text-right">Total Pendapatan</TableHead>
              <TableHead className="text-right">Estimasi Laba</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items?.map((item: any) => (
              <TableRow key={item.product_id}>
                <TableCell className="font-medium">{item.product_name}</TableCell>
                <TableCell>{item.sku || '-'}</TableCell>
                <TableCell className="text-right">{item.quantity_sold}</TableCell>
                <TableCell className="text-right">Rp {item.total_revenue.toLocaleString('id-ID')}</TableCell>
                <TableCell className="text-right text-green-600">
                  Rp {(item.total_revenue - item.total_cogs).toLocaleString('id-ID')}
                </TableCell>
              </TableRow>
            ))}
            {(!items || items.length === 0) && (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  Belum ada data penjualan pada periode ini.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
