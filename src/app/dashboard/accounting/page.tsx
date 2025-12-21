import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { BookOpen, TrendingUp, DollarSign } from 'lucide-react';

export default async function AccountingPage() {
  const supabase = await createClient();
  
  // Fetch recent journal entries
  const { data: entries } = await supabase
    .from('ledger_entries')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Akuntansi & Keuangan</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/accounting/balance-sheet" className="p-6 bg-white rounded-lg border shadow-sm hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900">Laporan Posisi Keuangan (Neraca)</h3>
                    <p className="text-slate-500">Lihat Aset, Liabilitas, dan Ekuitas</p>
                </div>
            </div>
        </Link>
        <Link href="/dashboard/accounting/journal" className="p-6 bg-white rounded-lg border shadow-sm hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900">Jurnal Umum</h3>
                    <p className="text-slate-500">Lihat semua riwayat transaksi</p>
                </div>
            </div>
        </Link>
        <Link href="/dashboard/accounting/income-statement" className="p-6 bg-white rounded-lg border shadow-sm hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-slate-900">Laporan Laba Rugi</h3>
                    <p className="text-slate-500">Lihat Pendapatan vs Beban</p>
                </div>
            </div>
        </Link>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b">
            <h3 className="font-bold text-lg">Transaksi Terakhir</h3>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                        <th className="px-6 py-3">Tanggal</th>
                        <th className="px-6 py-3">Deskripsi</th>
                        <th className="px-6 py-3">Akun Debit</th>
                        <th className="px-6 py-3">Akun Kredit</th>
                        <th className="px-6 py-3 text-right">Jumlah</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {entries?.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/50">
                            <td className="px-6 py-3">{new Date(entry.transaction_date).toLocaleDateString('id-ID')}</td>
                            <td className="px-6 py-3">{entry.description}</td>
                            <td className="px-6 py-3 font-mono text-xs">{entry.account_debit}</td>
                            <td className="px-6 py-3 font-mono text-xs">{entry.account_credit}</td>
                            <td className="px-6 py-3 text-right font-medium">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(entry.amount)}
                            </td>
                        </tr>
                    ))}
                    {entries?.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Belum ada transaksi tercatat.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}
