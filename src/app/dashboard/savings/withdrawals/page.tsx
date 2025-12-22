import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';

export default async function SavingsWithdrawalsPage() {
  const supabase = await createClient();

  const { data: withdrawals } = await supabase
    .from('savings_transactions')
    .select(`
        *,
        account:savings_accounts(account_number, product:savings_products(name)),
        member:member(nama_lengkap, nomor_anggota)
    `)
    .eq('type', 'withdrawal')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/savings" className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Riwayat Penarikan Simpanan</h1>
            <p className="text-slate-500">Daftar transaksi penarikan dana anggota.</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full caption-bottom text-sm">
            <thead className="bg-slate-50 border-b">
                <tr>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Tanggal</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Anggota</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Rekening</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Keterangan</th>
                    <th className="h-12 px-4 text-right font-medium text-slate-500">Jumlah Penarikan</th>
                    <th className="h-12 px-4 text-right font-medium text-slate-500">Sisa Saldo</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {withdrawals?.map((tx) => (
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
                        <td className="p-4">
                            <div className="font-medium">{tx.member?.nama_lengkap}</div>
                            <div className="text-xs text-slate-500">{tx.member?.nomor_anggota}</div>
                        </td>
                        <td className="p-4">
                            <div className="font-mono">{tx.account?.account_number}</div>
                            <div className="text-xs text-slate-500">{tx.account?.product?.name}</div>
                        </td>
                        <td className="p-4">{tx.description || '-'}</td>
                        <td className="p-4 text-right font-medium text-red-600">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Math.abs(tx.amount))}
                        </td>
                        <td className="p-4 text-right font-medium">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(tx.balance_after)}
                        </td>
                    </tr>
                ))}
                {withdrawals?.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                            Belum ada riwayat penarikan
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
