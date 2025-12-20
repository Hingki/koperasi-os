import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // We assume these exist or we create basic ones
import { Users, Wallet, Banknote, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = createClient();

  // Fetch Stats (Parallel)
  const [
    { count: memberCount },
    { count: loanCount },
    { data: activeLoans }
  ] = await Promise.all([
    supabase.from('member').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('loans').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('loans').select('remaining_principal').eq('status', 'active') // For total outstanding
  ]);

  const totalOutstanding = activeLoans?.reduce((sum, loan) => sum + Number(loan.remaining_principal), 0) || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
      
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">Total Members</h3>
                <Users className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold">{memberCount || 0}</div>
            <p className="text-xs text-slate-500">+2 from last month</p>
        </div>

        <div className="p-6 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">Active Loans</h3>
                <Banknote className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold">{loanCount || 0}</div>
            <p className="text-xs text-slate-500">Requires attention</p>
        </div>

        <div className="p-6 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">Outstanding Principal</h3>
                <TrendingUp className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalOutstanding)}
            </div>
            <p className="text-xs text-slate-500">Portfolio value</p>
        </div>

        <div className="p-6 bg-white rounded-lg border shadow-sm">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">Total Savings</h3>
                <Wallet className="h-4 w-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold">Rp 0</div>
            <p className="text-xs text-slate-500">Coming soon</p>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 p-6 bg-white rounded-lg border shadow-sm">
            <h3 className="font-semibold mb-4">Recent Transactions</h3>
            <div className="h-[200px] flex items-center justify-center text-slate-400 border-2 border-dashed rounded">
                Chart Placeholder
            </div>
        </div>
        <div className="col-span-3 p-6 bg-white rounded-lg border shadow-sm">
            <h3 className="font-semibold mb-4">Recent Applications</h3>
             <div className="space-y-4">
                <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                    <div className="flex-1 text-sm">Loan #L-2025-001</div>
                    <div className="text-xs text-slate-500">Pending Approval</div>
                </div>
                 <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <div className="flex-1 text-sm">Loan #L-2025-002</div>
                    <div className="text-xs text-slate-500">Disbursed</div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
