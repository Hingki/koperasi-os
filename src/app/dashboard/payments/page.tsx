import { createClient } from '@/lib/supabase/server';
import { PaymentActions } from './payment-actions';
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

export default async function AdminPaymentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata?.koperasi_id;

  // Fetch Pending Transactions
  const { data: transactions } = await supabase
    .from('payment_transactions')
    .select(`
      *,
      payment_source:payment_sources(name, method, bank_name)
    `)
    .eq('koperasi_id', koperasiId)
    .eq('payment_status', 'pending')
    .order('created_at', { ascending: false });

  // Helper to fetch member name (could be optimized with join if relationship exists)
  // Currently payment_transactions doesn't have direct FK to member, but has metadata->member_id or created_by
  // Let's try to fetch members for these transactions
  const memberIds = transactions?.map(t => t.metadata?.member_id).filter(Boolean) || [];
  let membersMap: Record<string, string> = {};
  
  if (memberIds.length > 0) {
    const { data: members } = await supabase
      .from('member')
      .select('id, nama_lengkap')
      .in('id', memberIds);
    
    members?.forEach(m => {
      membersMap[m.id] = m.nama_lengkap;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verifikasi Pembayaran</h1>
        <p className="text-slate-500">Konfirmasi pembayaran manual dari anggota.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Menunggu Konfirmasi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Anggota</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Info Pengirim</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{formatDate(tx.created_at)}</TableCell>
                  <TableCell>
                    {tx.metadata?.member_id ? (membersMap[tx.metadata.member_id] || 'Unknown Member') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {tx.transaction_type === 'savings_deposit' ? 'Setoran' : 
                     tx.transaction_type === 'loan_payment' ? 'Angsuran' : tx.transaction_type}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{tx.payment_source?.name}</span>
                      <span className="text-xs text-slate-500">{tx.payment_source?.bank_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{tx.proof_of_payment}</span>
                      {tx.metadata?.sender_note && (
                        <span className="text-xs text-slate-500 italic">"{tx.metadata.sender_note}"</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-bold">{formatCurrency(tx.amount)}</TableCell>
                  <TableCell>
                    <PaymentActions transactionId={tx.id} />
                  </TableCell>
                </TableRow>
              ))}
              {(!transactions || transactions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                    Tidak ada pembayaran menunggu konfirmasi
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
