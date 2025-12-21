import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Banknote, FileText, Settings, AlertCircle } from 'lucide-react';

export default async function LoansDashboardPage() {
  const supabase = await createClient();

  // Parallel fetch stats
  const [
    { count: activeCount },
    { count: pendingCount },
    { data: recentLoans }
  ] = await Promise.all([
    supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('loan_applications').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('loans')
      .select(`
        *,
        member:member(nama_lengkap, nomor_anggota),
        product:loan_products(name)
      `)
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Manajemen Pinjaman</h1>
            <p className="text-slate-500">Ringkasan portofolio pinjaman dan pengajuan.</p>
        </div>
        <div className="flex space-x-2">
            <Link href="/dashboard/loans/products">
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 h-10 px-4 py-2">
                    <Settings className="mr-2 h-4 w-4" />
                    Produk
                </button>
            </Link>
             <Link href="/dashboard/loans/approvals">
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2">
                    <FileText className="mr-2 h-4 w-4" />
                    Pengajuan
                    {pendingCount ? (
                        <span className="ml-2 bg-white text-blue-600 text-xs font-bold px-1.5 py-0.5 rounded-full">
                            {pendingCount}
                        </span>
                    ) : null}
                </button>
            </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="p-6 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">Pinjaman Aktif</h3>
                <Banknote className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold">{activeCount || 0}</div>
        </div>
        
        <div className="p-6 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">Menunggu Persetujuan</h3>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold">{pendingCount || 0}</div>
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
            <h3 className="font-bold text-lg">Pinjaman Aktif Terakhir</h3>
            <Link href="#" className="text-sm text-blue-600 hover:underline">Lihat Semua</Link>
        </div>
        <table className="w-full caption-bottom text-sm">
            <thead className="bg-slate-50 border-b">
                <tr>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Kode Pinjaman</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Anggota</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Produk</th>
                    <th className="h-12 px-4 text-right font-medium text-slate-500">Pokok Awal</th>
                    <th className="h-12 px-4 text-right font-medium text-slate-500">Sisa</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {recentLoans?.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-mono">{loan.loan_code}</td>
                        <td className="p-4">
                            <div className="font-medium">{loan.member?.nama_lengkap}</div>
                            <div className="text-xs text-slate-500">{loan.member?.nomor_anggota}</div>
                        </td>
                        <td className="p-4">{loan.product?.name}</td>
                        <td className="p-4 text-right">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(loan.principal_amount)}
                        </td>
                        <td className="p-4 text-right font-medium">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(loan.remaining_principal)}
                        </td>
                         <td className="p-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                loan.status === 'active' ? 'bg-green-100 text-green-800' : 
                                loan.status === 'defaulted' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                                {loan.status === 'active' ? 'Aktif' : loan.status}
                            </span>
                        </td>
                    </tr>
                ))}
                {recentLoans?.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500">Tidak ada pinjaman aktif.</td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
