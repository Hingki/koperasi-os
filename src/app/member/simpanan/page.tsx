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
import { WithdrawalDialog } from './withdrawal-dialog';
import { DigitalPaymentDialog } from '@/components/payment/digital-payment-dialog';

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
        interest_rate,
        is_withdrawal_allowed
      )
    `)
    .eq('member_id', member.id)
    .eq('status', 'active');

  // Fetch Transactions
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

  // Fetch Withdrawal Requests
  const { data: withdrawalRequests } = await supabase
    .from('savings_withdrawal_requests')
    .select(`
        id,
        created_at,
        amount,
        status,
        bank_name,
        account_number,
        admin_note,
        account:savings_accounts(
            product:savings_products(name)
        )
    `)
    .eq('member_id', member.id)
    .order('created_at', { ascending: false })
    .limit(20);

  const getTransactionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      deposit: 'Setoran',
      withdrawal: 'Penarikan',
      interest: 'Bunga',
      admin_fee: 'Biaya Admin',
    };
    return types[type] || type;
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'interest':
        return 'text-emerald-600';
      case 'withdrawal':
      case 'admin_fee':
        return 'text-red-600';
      default:
        return 'text-slate-900';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Menunggu</Badge>;
        case 'approved': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Disetujui</Badge>;
        case 'rejected': return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Ditolak</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Simpanan Saya</h2>
          <p className="text-slate-500">Informasi saldo dan riwayat transaksi simpanan.</p>
        </div>
        <WithdrawalDialog
          accounts={(accounts || []).map((a: any) => ({
            id: a.id,
            account_number: a.account_number,
            balance: a.balance,
            product: {
              name: a.product?.name,
              is_withdrawal_allowed: a.product?.is_withdrawal_allowed,
            },
          }))}
        />
      </div>

      {/* Accounts List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts?.map((account: any) => (
          <Card key={account.id} className="border-l-4 border-l-emerald-500 shadow-sm">
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
                <div className="flex gap-2 items-center">
                  <DigitalPaymentDialog 
                    type="savings_deposit" 
                    referenceId={account.id} 
                    title={`Top Up ${account.product.name}`}
                    trigger={
                      <button className="px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                        Top Up
                      </button>
                    }
                  />
                  <Badge variant="outline" className="capitalize bg-emerald-50 text-emerald-700 border-emerald-200">
                    {account.product.type}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
          {/* Transaction History */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Riwayat Transaksi</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Ket</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                        Belum ada transaksi.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions?.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="whitespace-nowrap text-slate-600">
                          <div className="font-medium">
                              {new Date(tx.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric', month: 'short'
                              })}
                          </div>
                          <div className="text-xs text-slate-500">
                              {new Date(tx.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </TableCell>
                        <TableCell>
                            <div className="text-sm font-medium">{getTransactionTypeLabel(tx.type)}</div>
                            <div className="text-xs text-slate-500 truncate max-w-[150px]">{tx.account?.product?.name}</div>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${getTransactionColor(tx.type)}`}>
                          {tx.type === 'deposit' || tx.type === 'interest' ? '+' : '-'}
                          {formatCurrency(tx.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Withdrawal Requests Status */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Status Penarikan</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalRequests?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                        Belum ada pengajuan penarikan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    withdrawalRequests?.map((req: any) => (
                      <TableRow key={req.id}>
                        <TableCell className="whitespace-nowrap text-slate-600">
                            <div className="font-medium">
                                {new Date(req.created_at).toLocaleDateString('id-ID', {
                                    day: 'numeric', month: 'short'
                                })}
                            </div>
                            <div className="text-xs text-slate-500">
                                {req.account?.product?.name}
                            </div>
                        </TableCell>
                        <TableCell>
                            {getStatusBadge(req.status)}
                            {req.status === 'rejected' && req.admin_note && (
                                <div className="text-xs text-red-600 mt-1 max-w-[150px] truncate" title={req.admin_note}>
                                    Note: {req.admin_note}
                                </div>
                            )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(req.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
