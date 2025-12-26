import { createClient } from '@/lib/supabase/server';
import { RentalService } from '@/lib/services/rental-service';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { RentalReturnDialog } from '../rental-return-dialog';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function RentalTransactionDetailPage({ params }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const rentalService = new RentalService(supabase);
  
  try {
    const tx = await rentalService.getRentalTransactionById(params.id);

    if (!tx) notFound();

    // Determine customer name
    const customerName = tx.customer_type === 'member' ? tx.member?.nama_lengkap : tx.customer?.name;
    const customerPhone = tx.customer_type === 'member' ? tx.member?.phone : tx.customer?.phone;
    const customerIdentity = tx.customer_type === 'member' ? tx.member?.nomor_anggota : tx.customer?.identity_number;

    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/rental/transactions">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Detail Transaksi</h1>
              <p className="text-sm text-slate-500">
                {tx.transaction_number}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { /* Print logic would go here usually via window.print() */ }}>
              <Printer className="mr-2 h-4 w-4" />
              Cetak Invoice
            </Button>
            {tx.status === 'active' || tx.status === 'overdue' ? (
                <RentalReturnDialog 
                    transactionId={tx.id} 
                    expectedReturnDate={tx.return_date_plan}
                    depositAmount={tx.deposit_amount}
                />
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="md:col-span-2 space-y-6">
                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h3 className="font-semibold text-lg mb-4 border-b pb-2">Informasi Sewa</h3>
                    <div className="grid grid-cols-2 gap-y-4 text-sm">
                        <div>
                            <span className="text-slate-500 block">Tanggal Sewa</span>
                            <span className="font-medium">{format(new Date(tx.rental_date), 'dd MMMM yyyy HH:mm', { locale: id })}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block">Rencana Kembali</span>
                            <span className="font-medium">{format(new Date(tx.return_date_plan), 'dd MMMM yyyy HH:mm', { locale: id })}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block">Status</span>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                                tx.status === 'active' ? 'bg-orange-100 text-orange-800' : 
                                tx.status === 'returned' ? 'bg-green-100 text-green-800' : 
                                'bg-red-100 text-red-800'
                            }`}>
                                {tx.status === 'active' ? 'Sedang Disewa' : tx.status === 'returned' ? 'Selesai' : tx.status}
                            </span>
                        </div>
                        {tx.return_date_actual && (
                            <div>
                                <span className="text-slate-500 block">Dikembalikan Pada</span>
                                <span className="font-medium text-green-600">{format(new Date(tx.return_date_actual), 'dd MMMM yyyy HH:mm', { locale: id })}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h3 className="font-semibold text-lg mb-4 border-b pb-2">Unit Disewa</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b">
                                <tr>
                                    <th className="px-4 py-2">Nama Unit</th>
                                    <th className="px-4 py-2 text-center">Durasi</th>
                                    <th className="px-4 py-2 text-right">Harga Satuan</th>
                                    <th className="px-4 py-2 text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {tx.items?.map((item: any) => (
                                    <tr key={item.id}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{item.item?.name}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {item.duration_value} {item.duration_unit === 'hour' ? 'Jam' : 'Hari'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            Rp {item.price_at_rental.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            Rp {item.subtotal.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h3 className="font-semibold text-lg mb-4 border-b pb-2">Pelanggan</h3>
                    <div className="space-y-3 text-sm">
                        <div>
                            <span className="text-slate-500 block">Nama</span>
                            <span className="font-medium">{customerName}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block">Tipe</span>
                            <span className="capitalize">{tx.customer_type === 'member' ? 'Anggota Koperasi' : 'Umum'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block">Identitas / No. Anggota</span>
                            <span className="font-mono">{customerIdentity || '-'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block">Telepon</span>
                            <span>{customerPhone || '-'}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg border shadow-sm p-6">
                    <h3 className="font-semibold text-lg mb-4 border-b pb-2">Rincian Biaya</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Total Sewa</span>
                            <span>Rp {(tx.total_amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">Deposit</span>
                            <span>Rp {(tx.deposit_amount || 0).toLocaleString()}</span>
                        </div>
                        {tx.discount_amount > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Diskon</span>
                                <span>- Rp {tx.discount_amount.toLocaleString()}</span>
                            </div>
                        )}
                        {tx.fine_amount > 0 && (
                            <div className="flex justify-between text-red-600 font-medium">
                                <span>Denda</span>
                                <span>+ Rp {tx.fine_amount.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                            <span>Total Akhir</span>
                            <span className="text-red-600">Rp {tx.final_amount.toLocaleString()}</span>
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded mt-4">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-medium text-slate-500 uppercase">Status Pembayaran</span>
                                <span className={`text-xs font-bold uppercase ${tx.payment_status === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.payment_status === 'paid' ? 'Lunas' : tx.payment_status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
  } catch (error) {
    notFound();
  }
}
