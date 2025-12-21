import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { redirect } from 'next/navigation';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

export default async function MemberSavingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('member')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!member) return <div>Member not found</div>;

  // Fetch Accounts
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

  // Fetch Recent Transactions (Limit 50)
  const { data: transactions } = await supabase
    .from('savings_transactions')
    .select(`
      id,
      created_at,
      type,
      amount,
      balance_after,
      description,
      account:savings_accounts (
        product:savings_products (name)
      )
    `)
    .eq('member_id', member.id)
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Simpanan Saya</h2>
        <p className="text-slate-500">Informasi saldo dan riwayat transaksi simpanan.</p>
      </div>

      {/* Accounts List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts?.map((account: any) => (
          <Card key={account.id} className="border-l-4 border-l-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-slate-500">
                {account.product.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 mb-1">
                {formatCurrency(account.balance)}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{account.account_number}</span>
                <Badge variant="outline" className="capitalize">
                  {account.product.type}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Jenis Simpanan</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead className="text-right">Saldo Akhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Belum ada transaksi.
                  </TableCell>
                </TableRow>
              ) : (
                transactions?.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell>{tx.account?.product?.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={tx.description}>
                      {tx.description || '-'}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      tx.type === 'deposit' || tx.type === 'interest' 
                        ? 'text-emerald-600' 
                        : 'text-red-600'
                    }`}>
                      {tx.type === 'deposit' || tx.type === 'interest' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell className="text-right text-slate-500">
                      {formatCurrency(tx.balance_after)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
