import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ArrowLeft, Printer, FileText, Download } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PrintButton } from '@/components/savings/print-button';

export default async function SavingsAccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  // Fetch Account Details
  const { data: account } = await supabase
    .from('savings_accounts')
    .select(`
        *,
        member:member(nama_lengkap, nomor_anggota, alamat, telepon),
        product:savings_products(*)
    `)
    .eq('id', id)
    .single();

  if (!account) {
    return notFound();
  }

  // Fetch Transactions
  const { data: transactions } = await supabase
    .from('savings_transactions')
    .select('*')
    .eq('account_id', id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <Link href="/dashboard/savings" className="p-2 hover:bg-slate-100 rounded-full">
                <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Detail Rekening</h1>
                <p className="text-slate-500">{account.account_number}</p>
            </div>
        </div>
        <div className="flex space-x-2">
            <PrintButton 
                title="Cetak Buku" 
                type="book" 
                data={{ account, transactions: transactions || [] }} 
                icon={<Printer className="w-4 h-4 mr-2" />}
            />
             <PrintButton 
                title="Cetak Mutasi" 
                type="mutation" 
                data={{ account, transactions: transactions || [] }} 
                icon={<FileText className="w-4 h-4 mr-2" />}
            />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Info */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
            <h3 className="font-bold border-b pb-2">Informasi Rekening</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-slate-500">Produk</div>
                <div className="font-medium">{account.product?.name}</div>
                
                <div className="text-slate-500">Saldo Saat Ini</div>
                <div className="font-medium text-lg text-red-600">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(account.balance)}
                </div>

                <div className="text-slate-500">Status</div>
                <div>
                     <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                        {account.status === 'active' ? 'Aktif' : account.status}
                    </span>
                </div>
                
                <div className="text-slate-500">Bunga</div>
                <div>{account.product?.interest_rate}% p.a.</div>
            </div>
        </div>

        {/* Member Info */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
            <h3 className="font-bold border-b pb-2">Informasi Anggota</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-slate-500">Nama Lengkap</div>
                <div className="font-medium">{account.member?.nama_lengkap}</div>

                <div className="text-slate-500">Nomor Anggota</div>
                <div className="font-mono">{account.member?.nomor_anggota}</div>

                <div className="text-slate-500">Telepon</div>
                <div>{account.member?.telepon || '-'}</div>

                <div className="text-slate-500">Alamat</div>
                <div className="line-clamp-2">{account.member?.alamat || '-'}</div>
            </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-bold">Riwayat Transaksi (Mutasi)</h3>
        </div>
        <table className="w-full caption-bottom text-sm">
            <thead className="bg-slate-50 border-b">
                <tr>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Tanggal</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Kode Transaksi</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Keterangan</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Tipe</th>
                    <th className="h-12 px-4 text-right font-medium text-slate-500">Jumlah</th>
                    <th className="h-12 px-4 text-right font-medium text-slate-500">Saldo Akhir</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {transactions?.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="p-4 whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </td>
                        <td className="p-4 font-mono text-xs">{tx.id.slice(0, 8)}</td>
                        <td className="p-4">{tx.description || '-'}</td>
                        <td className="p-4">
                             <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                tx.type === 'deposit' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                            }`}>
                                {tx.type === 'deposit' ? 'Setoran' : 'Penarikan'}
                            </span>
                        </td>
                        <td className={`p-4 text-right font-medium ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                            {tx.type === 'deposit' ? '+' : '-'}{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Math.abs(tx.amount))}
                        </td>
                        <td className="p-4 text-right font-medium">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(tx.balance_after)}
                        </td>
                    </tr>
                ))}
                 {transactions?.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                            Belum ada transaksi
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
