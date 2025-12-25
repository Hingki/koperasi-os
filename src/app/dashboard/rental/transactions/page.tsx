import { createClient } from '@/lib/supabase/server';
import { RentalService } from '@/lib/services/rental-service';
import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default async function RentalTransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const koperasiId = user.user_metadata.koperasi_id;
  const rentalService = new RentalService(supabase);
  
  // Safe check if koperasiId exists and is valid UUID
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  const transactions = isValidUUID 
    ? await rentalService.getRentalTransactions(koperasiId) 
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transaksi Sewa</h1>
          <p className="text-sm text-slate-500">
            Daftar penyewaan unit (aktif, reservasi, dan selesai)
          </p>
        </div>
        <Link href="/dashboard/rental/transactions/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Buat Transaksi Baru
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            aria-label="Cari transaksi"
            placeholder="Cari no. transaksi atau nama..." 
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">No. Transaksi</th>
                <th className="px-6 py-4">Tanggal Sewa</th>
                <th className="px-6 py-4">Pelanggan</th>
                <th className="px-6 py-4 text-center">Rencana Kembali</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Pembayaran</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    Belum ada transaksi sewa.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {tx.transaction_number}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {format(new Date(tx.rental_date), 'dd MMM yyyy', { locale: id })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{tx.customer_name}</div>
                      <div className="text-xs text-slate-500">{tx.customer_type === 'member' ? 'Anggota' : 'Umum'}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600">
                      {format(new Date(tx.return_date_plan), 'dd MMM HH:mm', { locale: id })}
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tx.status === 'active'
                          ? 'bg-blue-100 text-blue-800'
                          : tx.status === 'returned'
                          ? 'bg-green-100 text-green-800'
                          : tx.status === 'overdue'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}>
                        {tx.status === 'active' ? 'Sedang Sewa' : tx.status === 'returned' ? 'Selesai' : tx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tx.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : tx.payment_status === 'partial'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tx.payment_status === 'paid' ? 'Lunas' : tx.payment_status === 'partial' ? 'Sebagian' : 'Belum Lunas'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      Rp {tx.final_amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm">Detail</Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
