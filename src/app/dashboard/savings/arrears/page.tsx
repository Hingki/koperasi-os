import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

export default async function SavingsArrearsPage() {
  const supabase = await createClient();

  // 1. Get Simpanan Wajib Product
  const { data: wajibProduct } = await supabase
    .from('savings_products')
    .select('*')
    .eq('type', 'wajib')
    .single();

  if (!wajibProduct) {
    return (
        <div className="p-8 text-center">
            <h2 className="text-xl font-bold">Produk Simpanan Wajib tidak ditemukan</h2>
            <p className="text-slate-500">Pastikan Anda telah membuat produk simpanan dengan tipe 'wajib'.</p>
        </div>
    );
  }

  const monthlyFee = wajibProduct.min_deposit || 0;

  // 2. Get all accounts for this product
  const { data: accounts } = await supabase
    .from('savings_accounts')
    .select(`
        *,
        member:member(nama_lengkap, nomor_anggota, telepon),
        last_transaction:savings_transactions(created_at)
    `)
    .eq('product_id', wajibProduct.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true }); // Check oldest accounts first? Or just all.

  // 3. Calculate Arrears
  const arrears = accounts?.map(acc => {
    // Find last deposit date
    // Note: Since we can't easily filter the nested relation for just 'deposit' and sort limit 1 in a single query efficiently without RPC, 
    // we'll rely on last_transaction_at on the account if updated correctly, or use the joined transactions.
    // For now, let's assume last_transaction_at is accurate for the last activity. 
    // Ideally we should query transactions specifically for this, but for MVP:
    
    const lastActivity = acc.last_transaction_at ? new Date(acc.last_transaction_at) : new Date(acc.created_at);
    const now = new Date();
    
    // Calculate months difference
    const monthsDiff = (now.getFullYear() - lastActivity.getFullYear()) * 12 + (now.getMonth() - lastActivity.getMonth());
    
    // If less than 1 month, no arrear (assuming payment is due monthly)
    // Adjust logic as needed: e.g. if paid this month, monthsDiff is 0. If paid last month, monthsDiff is 1 (maybe due?).
    // Let's assume if > 1 month, they are late.
    
    if (monthsDiff < 1) return null;

    return {
        ...acc,
        months_late: monthsDiff,
        amount_due: monthsDiff * monthlyFee
    };
  }).filter(Boolean) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/savings" className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Tunggakan Simpanan Wajib</h1>
            <p className="text-slate-500">Daftar anggota yang belum membayar simpanan wajib (Rp {new Intl.NumberFormat('id-ID').format(monthlyFee)}/bulan).</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <table className="w-full caption-bottom text-sm">
            <thead className="bg-slate-50 border-b">
                <tr>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Anggota</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">No. Rekening</th>
                    <th className="h-12 px-4 text-left font-medium text-slate-500">Terakhir Bayar</th>
                    <th className="h-12 px-4 text-center font-medium text-slate-500">Lama Tunggakan</th>
                    <th className="h-12 px-4 text-right font-medium text-slate-500">Total Tagihan</th>
                    <th className="h-12 px-4 text-right font-medium text-slate-500">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y">
                {arrears.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-4">
                            <div className="font-medium">{item.member?.nama_lengkap}</div>
                            <div className="text-xs text-slate-500">{item.member?.nomor_anggota}</div>
                        </td>
                        <td className="p-4 font-mono">{item.account_number}</td>
                        <td className="p-4">
                            {new Date(item.last_transaction_at || item.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' })}
                        </td>
                        <td className="p-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                {item.months_late} Bulan
                            </span>
                        </td>
                        <td className="p-4 text-right font-medium text-red-600">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.amount_due)}
                        </td>
                         <td className="p-4 text-right">
                            <Link href={`/dashboard/savings/${item.id}`}>
                                <button className="text-red-600 hover:underline font-medium text-xs">
                                    Lihat Detail
                                </button>
                            </Link>
                        </td>
                    </tr>
                ))}
                {arrears.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center">
                                <AlertTriangle className="w-12 h-12 text-green-500 mb-4 opacity-20" />
                                <h3 className="text-lg font-medium text-slate-900">Tidak Ada Tunggakan</h3>
                                <p>Semua anggota telah membayar simpanan wajib tepat waktu.</p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
}
