import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CreatePaymentDialog } from './create-payment-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export default async function PaymentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('member')
    .select('id, koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!member) return <div>Member not found</div>;

  // 1. Get Savings Accounts
  const { data: savingsAccounts } = await supabase
    .from('savings_accounts')
    .select(`
      id, 
      account_number, 
      product:savings_products(name)
    `)
    .eq('member_id', member.id)
    .eq('status', 'active');

  // 2. Get Active Loans
  const { data: loans } = await supabase
    .from('loans')
    .select('id, principal_amount, status')
    .eq('member_id', member.id)
    .in('status', ['active', 'approved']);

  // 3. Get Payment Sources (Active)
  const { data: paymentSources } = await supabase
    .from('payment_sources')
    .select('*')
    .eq('koperasi_id', member.koperasi_id)
    .eq('is_active', true)
    .order('name');

  // 4. Get Payment History
  // We filter by created_by (user) or metadata->member_id
  const { data: history } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('koperasi_id', member.koperasi_id)
    .or(`created_by.eq.${user.id},metadata->>member_id.eq.${member.id}`)
    .order('created_at', { ascending: false })
    .limit(20);

  function getStatusBadge(status: string) {
    switch (status) {
      case 'success': return <Badge className="bg-emerald-600">Berhasil</Badge>;
      case 'pending': return <Badge variant="outline" className="text-amber-600 border-amber-600">Menunggu</Badge>;
      case 'failed': return <Badge variant="destructive">Gagal</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  }

  function getTypeName(type: string) {
    if (type === 'savings_deposit') return 'Setor Simpanan';
    if (type === 'loan_payment') return 'Bayar Angsuran';
    return type;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pembayaran</h1>
          <p className="text-slate-500">Lakukan pembayaran simpanan atau angsuran.</p>
        </div>
        <CreatePaymentDialog 
          savingsAccounts={savingsAccounts || []} 
          loans={loans || []} 
          paymentSources={paymentSources || []} 
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pembayaran</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history?.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{formatDate(tx.created_at)}</TableCell>
                  <TableCell>{getTypeName(tx.transaction_type)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{tx.payment_method}</span>
                      <span className="text-xs text-slate-500">{tx.payment_provider}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(tx.amount)}</TableCell>
                  <TableCell>{getStatusBadge(tx.payment_status)}</TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {tx.proof_of_payment && (
                      <span title={tx.proof_of_payment}>Info: {tx.proof_of_payment}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(!history || history.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Belum ada riwayat pembayaran
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
