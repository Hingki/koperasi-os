
import { createClient } from '@/lib/supabase/server';
import { PPOBForm } from './ppob-form';
import { redirect } from 'next/navigation';
import { Account } from '../../../lib/types/savings';
import { getPPOBProducts } from '@/lib/actions/member-ppob';

export default async function PPOBPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const products = await getPPOBProducts();

  // Get koperasi_id via member
  const { data: member } = await supabase
    .from('member')
    .select('id, koperasi_id')
    .eq('user_id', user.id)
    .single();

  // PPOB Settings (admin fee)
  let adminFee = 0;
  if (member?.koperasi_id) {
    const { data: settings } = await supabase
      .from('ppob_settings')
      .select('admin_fee')
      .eq('koperasi_id', member.koperasi_id)
      .maybeSingle();
    adminFee = Number(settings?.admin_fee || 0);
  }

  // Fetch Member's Active Savings Accounts
  const { data: accounts } = await supabase
    .from('savings_accounts')
    .select(`
        *,
        product:savings_products(*)
    `)
    .eq('member_id', user.id)
    .eq('status', 'active');
  
  // Note: If user.id is auth.uid(), we need to ensure member_id matches or query via member table if needed.
  // In this system, it seems `savings_accounts` stores `member_id` which might be a UUID from `member` table.
  // We should verify if `member_id` in `savings_accounts` is the same as `auth.uid()` or if we need to look it up.
  // Let's assume for now that RLS handles the access or we query correctly.
  
  let userAccounts: Account[] = [];

  if (member) {
      const { data } = await supabase
        .from('savings_accounts')
        .select(`
            *,
            product:savings_products(*)
        `)
        .eq('member_id', member.id)
        .eq('status', 'active');
      
      if (data) userAccounts = data as unknown as Account[];
  }

  // PPOB Logs
  const { data: logs } = await supabase
    .from('ppob_transactions')
    .select('*')
    .eq('member_id', member?.id || '')
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Layanan Digital</h1>
        <p className="text-slate-500">Beli pulsa, paket data, dan bayar tagihan dengan mudah.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <PPOBForm accounts={userAccounts} adminFee={adminFee} products={products} />
        </div>
        
        <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Informasi</h3>
                <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                    <li>Pastikan nomor tujuan benar.</li>
                    <li>Transaksi yang berhasil tidak dapat dibatalkan.</li>
                    <li>Saldo akan terpotong otomatis dari rekening simpanan yang dipilih.</li>
                    <li>Jika transaksi gagal, saldo akan dikembalikan.</li>
                </ul>
            </div>
            
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <h3 className="font-semibold text-amber-900 mb-2">Butuh Bantuan?</h3>
                <p className="text-sm text-amber-800 mb-2">
                    Jika mengalami kendala transaksi, silakan hubungi layanan pelanggan kami.
                </p>
            </div>

            <div className="p-4 bg-white border rounded-lg">
                <h3 className="font-semibold mb-3">Log Transaksi PPOB</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left">Tanggal</th>
                        <th className="px-3 py-2 text-left">Produk</th>
                        <th className="px-3 py-2 text-left">Kategori</th>
                        <th className="px-3 py-2 text-left">Tujuan</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(logs || []).map((l: any) => (
                        <tr key={l.id}>
                          <td className="px-3 py-2 text-slate-600">{new Date(l.created_at).toLocaleString('id-ID')}</td>
                          <td className="px-3 py-2">{l.product_name}</td>
                          <td className="px-3 py-2 capitalize">{l.category}</td>
                          <td className="px-3 py-2">{l.customer_number}</td>
                          <td className="px-3 py-2 text-right">Rp {Number(l.total_amount).toLocaleString('id-ID')}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs ${l.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {(!logs || logs.length === 0) && (
                        <tr>
                          <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>Belum ada transaksi.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
