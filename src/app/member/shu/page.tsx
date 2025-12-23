import { createClient } from '@/lib/supabase/server';
import { calculateAccountBalances, classifyIncomeStatement } from '@/lib/utils/accounting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { redirect } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, PieChart, TrendingUp, Wallet, ShoppingCart } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default async function MemberSHUPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('member')
    .select('id, koperasi_id, nama_lengkap')
    .eq('user_id', user.id)
    .single();

  if (!member) return <div>Member not found</div>;

  const koperasiId = member.koperasi_id;

  // --- 1. CALCULATE GLOBAL NET PROFIT (SHU KOPERASI) ---
  // Ideally cached or periodic, but for now live calc
  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .eq('koperasi_id', koperasiId)
    .order('account_code');

  const { data: entries } = await supabase
    .from('ledger_entry')
    .select('account_debit, account_credit, amount')
    .eq('koperasi_id', koperasiId)
    .eq('status', 'posted');

  const balances = calculateAccountBalances(accounts || [], entries || []);
  const incomeStatement = classifyIncomeStatement(balances);
  const netProfit = incomeStatement.netProfit;

  // --- 2. CALCULATE JASA MODAL (Based on Simpanan Pokok & Wajib) ---
  // Global Savings (Pokok + Wajib)
  const { data: allSavings } = await supabase
    .from('savings_accounts')
    .select(`
        balance, 
        member_id,
        product:savings_products!inner(type)
    `)
    .eq('koperasi_id', koperasiId)
    .eq('status', 'active')
    .in('product.type', ['pokok', 'wajib']);

  const totalModalSavings = allSavings?.reduce((sum, acc) => sum + acc.balance, 0) || 0;
  
  // Member Savings (Pokok + Wajib)
  const memberSavingsList = allSavings?.filter(acc => acc.member_id === member.id) || [];
  const memberModalSavings = memberSavingsList.reduce((sum, acc) => sum + acc.balance, 0);

  // --- 3. CALCULATE JASA USAHA (Based on Loan Interest + Retail Spend) ---
  // A. Loan Interest Paid
  // We query loan_repayment_schedule where status='paid'
  const { data: paidInstallments } = await supabase
    .from('loan_repayment_schedule')
    .select('interest_portion, member_id')
    .eq('koperasi_id', koperasiId)
    .eq('status', 'paid');
  
  const totalLoanInterest = paidInstallments?.reduce((sum, inst) => sum + inst.interest_portion, 0) || 0;
  const memberLoanInterest = paidInstallments?.filter(i => i.member_id === member.id)
    .reduce((sum, inst) => sum + inst.interest_portion, 0) || 0;

  // B. Retail Spending
  const { data: retailTx } = await supabase
    .from('pos_transactions')
    .select('final_amount, member_id')
    .eq('koperasi_id', koperasiId)
    .eq('payment_status', 'paid');
    // Note: If member_id is null, it's non-member transaction (doesn't count for member distribution base, but contributes to profit)

  const totalMemberRetail = retailTx?.filter(t => t.member_id).reduce((sum, t) => sum + t.final_amount, 0) || 0;
  const memberRetail = retailTx?.filter(t => t.member_id === member.id).reduce((sum, t) => sum + t.final_amount, 0) || 0;

  // Total Partisipasi Usaha (Interest + Retail)
  const totalUsaha = totalLoanInterest + totalMemberRetail;
  const memberUsaha = memberLoanInterest + memberRetail;

  // --- 4. SHU ALLOCATION LOGIC ---
  const isLoss = netProfit <= 0;
  
  // Constants (Should be from config/AD-ART)
  const ALLOCATION_MEMBER = 0.40; // 40% for Members
  const SPLIT_MODAL = 0.50; // 50% of Member Share for Capital
  const SPLIT_USAHA = 0.50; // 50% of Member Share for Business

  const totalSHUMembers = Math.max(0, netProfit * ALLOCATION_MEMBER);
  const totalSHUModal = totalSHUMembers * SPLIT_MODAL;
  const totalSHUUsaha = totalSHUMembers * SPLIT_USAHA;

  // Individual Calculation
  const percentageModal = totalModalSavings > 0 ? (memberModalSavings / totalModalSavings) : 0;
  const percentageUsaha = totalUsaha > 0 ? (memberUsaha / totalUsaha) : 0;

  const estSHUModal = totalSHUModal * percentageModal;
  const estSHUUsaha = totalSHUUsaha * percentageUsaha;
  const totalEstSHU = estSHUModal + estSHUUsaha;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Info SHU</h2>
        <p className="text-slate-500">Estimasi Sisa Hasil Usaha Tahun Berjalan.</p>
      </div>

      {isLoss ? (
        <Alert variant="destructive">
          <Info className="h-4 w-4" />
          <AlertTitle>Tidak Ada Pembagian SHU</AlertTitle>
          <AlertDescription>
            Saat ini koperasi belum mencatatkan keuntungan (net profit). SHU akan tersedia jika koperasi memiliki profit positif.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Main SHU Card */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white border-none shadow-lg">
                <CardHeader className="pb-2">
                    <CardTitle className="text-emerald-100 text-sm font-medium">Estimasi SHU Anda</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold mb-2">{formatCurrency(totalEstSHU)}</div>
                    <p className="text-emerald-100 text-xs opacity-90">
                        *Nilai ini adalah estimasi sementara berdasarkan aktivitas anda hingga hari ini. Nilai final ditetapkan saat RAT.
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-slate-500 text-sm font-medium">Total SHU Koperasi</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-slate-900 mb-2">{formatCurrency(netProfit)}</div>
                    <div className="space-y-1">
                         <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Alokasi Anggota (40%)</span>
                            <span className="font-medium">{formatCurrency(totalSHUMembers)}</span>
                         </div>
                         <Progress value={40} className="h-2" />
                    </div>
                </CardContent>
            </Card>
          </div>

          {/* Breakdown Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Jasa Modal */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Jasa Modal</CardTitle>
                            <CardDescription>Dari Simpanan Pokok & Wajib</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-end border-b pb-4">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Estimasi Diterima</p>
                            <p className="text-2xl font-bold text-blue-600">{formatCurrency(estSHUModal)}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-slate-400">Partisipasi Anda</p>
                             <p className="font-medium text-slate-700">{(percentageModal * 100).toFixed(4)}%</p>
                        </div>
                    </div>
                    <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Simpanan Anda</span>
                            <span className="font-medium">{formatCurrency(memberModalSavings)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Total Simpanan Anggota</span>
                            <span className="font-medium">{formatCurrency(totalModalSavings)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Jasa Usaha */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                            <ShoppingCart className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base">Jasa Usaha</CardTitle>
                            <CardDescription>Dari Transaksi & Pinjaman</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-end border-b pb-4">
                        <div>
                            <p className="text-sm text-slate-500 mb-1">Estimasi Diterima</p>
                            <p className="text-2xl font-bold text-orange-600">{formatCurrency(estSHUUsaha)}</p>
                        </div>
                        <div className="text-right">
                             <p className="text-xs text-slate-400">Partisipasi Anda</p>
                             <p className="font-medium text-slate-700">{(percentageUsaha * 100).toFixed(4)}%</p>
                        </div>
                    </div>
                    <div className="space-y-2 pt-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Transaksi Anda</span>
                            <span className="font-medium">{formatCurrency(memberUsaha)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Total Transaksi Anggota</span>
                            <span className="font-medium">{formatCurrency(totalUsaha)}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </div>

          <Alert className="bg-slate-50 border-slate-200">
            <Info className="h-4 w-4 text-slate-500" />
            <AlertTitle className="text-slate-700">Informasi Perhitungan</AlertTitle>
            <AlertDescription className="text-slate-600 text-sm mt-2">
              <ul className="list-disc list-inside space-y-1">
                <li><strong>SHU Anggota</strong> dialokasikan sebesar {ALLOCATION_MEMBER * 100}% dari Total SHU Koperasi.</li>
                <li><strong>Jasa Modal</strong> ({SPLIT_MODAL * 100}%) dibagikan proporsional berdasarkan jumlah Simpanan Pokok & Wajib.</li>
                <li><strong>Jasa Usaha</strong> ({SPLIT_USAHA * 100}%) dibagikan proporsional berdasarkan jasa pinjaman dan belanja anggota.</li>
              </ul>
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
