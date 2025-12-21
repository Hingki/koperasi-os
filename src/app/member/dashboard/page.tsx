import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Banknote, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { redirect } from 'next/navigation';

export default async function MemberDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // 1. Get Member ID
  const { data: member } = await supabase
    .from('member')
    .select('id, nama_lengkap, koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return (
      <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md">
        Akun anda belum terhubung dengan data anggota. Silakan hubungi admin.
      </div>
    );
  }

  // 2. Fetch Stats in Parallel
  const [
    savingsResult,
    loansResult,
    installmentsResult,
    recentTxResult
  ] = await Promise.all([
    // Total Savings
    supabase
      .from('savings_accounts')
      .select('balance')
      .eq('member_id', member.id)
      .eq('status', 'active'),

    // Total Active Loans
    supabase
      .from('loans')
      .select('remaining_principal')
      .eq('member_id', member.id)
      .eq('status', 'active'),

    // Next Installment (This Month)
    supabase
      .from('loan_installments')
      .select('amount_due, due_date')
      .eq('member_id', member.id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })
      .limit(1),

    // Recent Transactions (Savings)
    supabase
      .from('savings_transactions')
      .select('created_at, type, amount, description')
      .eq('member_id', member.id)
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  // Calculate Totals
  const totalSavings = savingsResult.data?.reduce((sum, acc) => sum + acc.balance, 0) || 0;
  const totalLoans = loansResult.data?.reduce((sum, loan) => sum + loan.remaining_principal, 0) || 0;
  
  const nextInstallment = installmentsResult.data?.[0];
  const nextInstallmentAmount = nextInstallment?.amount_due || 0;
  const nextInstallmentDate = nextInstallment?.due_date 
    ? new Date(nextInstallment.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
    : '-';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard Anggota</h2>
        <p className="text-slate-500">Selamat datang kembali, {member.nama_lengkap}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Simpanan</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalSavings)}</div>
            <p className="text-xs text-muted-foreground">Saldo tersedia saat ini</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sisa Pinjaman</CardTitle>
            <Banknote className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalLoans)}</div>
            <p className="text-xs text-muted-foreground">Total pokok belum lunas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tagihan Berikutnya</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(nextInstallmentAmount)}</div>
            <p className="text-xs text-muted-foreground">Jatuh tempo: {nextInstallmentDate}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Riwayat Transaksi Terakhir</h3>
        <Card>
          <CardContent className="p-0">
            {recentTxResult.data && recentTxResult.data.length > 0 ? (
              <div className="divide-y">
                {recentTxResult.data.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        tx.type === 'deposit' ? 'bg-emerald-100' : 'bg-red-100'
                      }`}>
                        {tx.type === 'deposit' ? (
                          <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {tx.type === 'deposit' ? 'Setoran Simpanan' : 'Penarikan Simpanan'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {new Date(tx.created_at).toLocaleDateString('id-ID', { 
                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold ${
                      tx.type === 'deposit' ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {tx.type === 'deposit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500">
                Belum ada transaksi simpanan.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
