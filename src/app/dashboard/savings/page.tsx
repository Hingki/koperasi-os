import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Wallet, Settings, ArrowUpRight, ArrowDownLeft, FileSpreadsheet } from 'lucide-react';

export default async function SavingsDashboardPage() {
  const supabase = await createClient();
  
  // Fetch savings stats
  const { count: accountCount } = await supabase
    .from('savings_accounts')
    .select('*', { count: 'exact', head: true });

  const { data: accounts } = await supabase
    .from('savings_accounts')
    .select(`
        *,
        member:member(nama_lengkap, nomor_anggota),
        product:savings_products(name)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Simpanan</h1>
            <p className="text-slate-500">Kelola rekening simpanan anggota dan transaksi.</p>
        </div>
        <div className="flex space-x-2">
            <Link href="/dashboard/savings/products">
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 h-10 px-4 py-2">
                    <Settings className="mr-2 h-4 w-4" />
                    Produk
                </button>
            </Link>
             <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Setoran
            </button>
             <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 h-10 px-4 py-2">
                <ArrowDownLeft className="mr-2 h-4 w-4" />
                Penarikan
            </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-6 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">Total Rekening</h3>
                <Wallet className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold">{accountCount || 0}</div>
        </div>
        {/* Add more stats here later */}
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <div className="p-6 border-b">
            <h3 className="font-bold text-lg">Rekening Terbaru</h3>
        </div>
        <table className="w-full caption-bottom text-sm">
            <thead className="bg-slate-50 border-b">
                <tr>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">No. Rekening</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Anggota</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Produk</th>
                    <th className="h-12 px-4 text-right font-medium text-slate-500">Saldo</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {accounts?.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-mono">{acc.account_number}</td>
                        <td className="p-4">
                            <div className="font-medium">{acc.member?.nama_lengkap}</div>
                            <div className="text-xs text-slate-500">{acc.member?.nomor_anggota}</div>
                        </td>
                        <td className="p-4">{acc.product?.name}</td>
                        <td className="p-4 text-right font-medium">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(acc.balance)}
                        </td>
                         <td className="p-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${acc.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                                {acc.status === 'active' ? 'Aktif' : acc.status}
                            </span>
                        </td>
                    </tr>
                ))}
                {accounts?.length === 0 && (
                    <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-500">Tidak ada rekening simpanan ditemukan.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
