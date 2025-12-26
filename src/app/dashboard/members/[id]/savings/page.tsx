import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function MemberSavingsDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const memberId = params.id;

  const { data: member } = await supabase
    .from('member')
    .select('id, nama_lengkap, nomor_anggota')
    .eq('id', memberId)
    .maybeSingle();

  if (!member) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Anggota Tidak Ditemukan</h1>
        <Link href="/dashboard/members" prefetch={false} className="text-red-600 hover:underline">Kembali ke daftar anggota</Link>
      </div>
    );
  }

  const { data: accounts } = await supabase
    .from('savings_accounts')
    .select(`
      id,
      account_number,
      balance,
      status,
      product:savings_products (
        name,
        type,
        interest_rate
      )
    `)
    .eq('member_id', member.id)
    .eq('status', 'active');

  const { data: transactions } = await supabase
    .from('savings_transactions')
    .select(`
      id,
      transaction_date,
      type,
      amount,
      balance_after,
      description,
      account:savings_accounts (
        account_number,
        product:savings_products (name)
      )
    `)
    .eq('member_id', member.id)
    .order('transaction_date', { ascending: false })
    .limit(50);

  const formatCurrency = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);
  const typeLabel = (t: string) => ({ deposit: 'Setoran', withdrawal: 'Penarikan', interest: 'Bunga', admin_fee: 'Biaya Admin' }[t] || t);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Simpanan Anggota</h1>
          <p className="text-slate-500">Informasi simpanan untuk {member.nama_lengkap} ({member.nomor_anggota})</p>
        </div>
        <Link href="/dashboard/members" prefetch={false} className="text-red-600 hover:underline">Kembali</Link>
      </div>

      <div className="rounded-md border bg-white">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Rekening Simpanan Aktif</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">No. Rekening</th>
              <th className="text-left p-3">Produk</th>
              <th className="text-left p-3">Jenis</th>
              <th className="text-left p-3">Saldo</th>
              <th className="text-left p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {(accounts || []).map((acc: any) => (
              <tr key={acc.id} className="border-t">
                <td className="p-3">{acc.account_number}</td>
                <td className="p-3">{acc.product?.name}</td>
                <td className="p-3">{acc.product?.type}</td>
                <td className="p-3 font-semibold text-emerald-700">{formatCurrency(Number(acc.balance || 0))}</td>
                <td className="p-3">{acc.status}</td>
              </tr>
            ))}
            {(!accounts || accounts.length === 0) && (
              <tr>
                <td className="p-3 text-slate-500" colSpan={5}>Tidak ada rekening aktif</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-md border bg-white">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Transaksi Terakhir</h2>
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3">Tanggal</th>
              <th className="text-left p-3">Produk</th>
              <th className="text-left p-3">No. Rekening</th>
              <th className="text-left p-3">Jenis</th>
              <th className="text-left p-3">Nilai</th>
              <th className="text-left p-3">Saldo Setelah</th>
              <th className="text-left p-3">Deskripsi</th>
            </tr>
          </thead>
          <tbody>
            {(transactions || []).map((tx: any) => (
              <tr key={tx.id} className="border-t">
                <td className="p-3">{new Date(tx.transaction_date).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                <td className="p-3">{tx.account?.product?.name}</td>
                <td className="p-3">{tx.account?.account_number}</td>
                <td className="p-3">{typeLabel(tx.type)}</td>
                <td className="p-3">{formatCurrency(Number(tx.amount || 0))}</td>
                <td className="p-3">{formatCurrency(Number(tx.balance_after || 0))}</td>
                <td className="p-3">{tx.description || '-'}</td>
              </tr>
            ))}
            {(!transactions || transactions.length === 0) && (
              <tr>
                <td className="p-3 text-slate-500" colSpan={7}>Belum ada transaksi</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
