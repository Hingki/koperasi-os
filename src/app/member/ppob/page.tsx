import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Wifi, Zap, Droplets, CreditCard, History } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { redirect } from 'next/navigation';

export default async function MemberPpobPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('member')
    .select('id, koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!member) return <div>Member not found</div>;

  // Fetch Recent PPOB Transactions
  const { data: transactions } = await supabase
    .from('ppob_transactions')
    .select('*')
    .eq('member_id', member.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const services = [
    { name: 'Pulsa', icon: Smartphone, href: '/member/ppob/pulsa', color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Paket Data', icon: Wifi, href: '/member/ppob/data', color: 'text-green-600', bg: 'bg-green-100' },
    { name: 'Token PLN', icon: Zap, href: '/member/ppob/pln', color: 'text-yellow-600', bg: 'bg-yellow-100' },
    { name: 'PDAM', icon: Droplets, href: '/member/ppob/pdam', color: 'text-cyan-600', bg: 'bg-cyan-100' },
    { name: 'BPJS', icon: CreditCard, href: '/member/ppob/bpjs', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Layanan Digital</h1>
        <p className="text-slate-500">Beli pulsa, paket data, dan bayar tagihan dengan mudah.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {services.map((service) => (
          <Link key={service.name} href={service.href} prefetch={false}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer border-slate-200">
              <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
                <div className={`p-4 rounded-full ${service.bg}`}>
                  <service.icon className={`h-8 w-8 ${service.color}`} />
                </div>
                <span className="font-medium text-slate-900">{service.name}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-slate-500" />
            <CardTitle>Riwayat Transaksi</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="p-3 text-left font-medium text-slate-500">Layanan</th>
                  <th className="p-3 text-left font-medium text-slate-500">Produk</th>
                  <th className="p-3 text-left font-medium text-slate-500">Nomor</th>
                  <th className="p-3 text-right font-medium text-slate-500">Total</th>
                  <th className="p-3 text-center font-medium text-slate-500">Status</th>
                  <th className="p-3 text-right font-medium text-slate-500">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {transactions?.map((trx) => (
                  <tr key={trx.id} className="border-b last:border-0">
                    <td className="p-3 font-medium capitalize">{trx.category}</td>
                    <td className="p-3">{trx.product_name}</td>
                    <td className="p-3 font-mono text-slate-600">{trx.customer_number}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(trx.total_amount)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        trx.status === 'success' ? 'bg-green-100 text-green-700' :
                        trx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {trx.status === 'success' ? 'Berhasil' : trx.status === 'pending' ? 'Proses' : 'Gagal'}
                      </span>
                    </td>
                    <td className="p-3 text-right text-slate-500">
                      {new Date(trx.created_at).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
                {!transactions?.length && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500">
                      Belum ada transaksi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
