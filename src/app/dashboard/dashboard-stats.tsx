import { createClient } from '@/lib/supabase/server';
import { Users, Wallet, Banknote, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface DashboardStatsProps {
  koperasiId?: string;
  isAdmin: boolean;
}

export async function DashboardStats({ koperasiId, isAdmin }: DashboardStatsProps) {
  const supabase = await createClient();
  
  // Initialize default values
  let memberCount = 0;
  let loanCount = 0;
  let totalOutstanding = 0;
  
  // Only fetch if we have a valid koperasi ID
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  if (isValidUUID && koperasiId) {
    try {
        // Run parallel queries
        const [
            membersResult,
            loansResult,
            activeLoansResult
        ] = await Promise.all([
            supabase.from('member').select('*', { count: 'exact', head: true }).eq('koperasi_id', koperasiId).eq('status', 'active'),
            supabase.from('loans').select('*', { count: 'exact', head: true }).eq('koperasi_id', koperasiId).eq('status', 'active'),
            supabase.from('loans').select('remaining_principal').eq('koperasi_id', koperasiId).eq('status', 'active')
        ]);
        
        memberCount = membersResult.count || 0;
        loanCount = loansResult.count || 0;
        
        // Calculate total outstanding
        // Note: For large datasets, this should be moved to an RPC call
        const activeLoans = activeLoansResult.data as { remaining_principal: number }[] | null;
        totalOutstanding = activeLoans?.reduce((sum, loan) => sum + (Number(loan.remaining_principal) || 0), 0) || 0;
    } catch (e) {
        console.error("Error loading dashboard stats:", e);
        // Fallback to 0 is already set by default values
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isAdmin && (
            <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <h3 className="tracking-tight text-sm font-medium text-slate-500">Total Anggota</h3>
                    <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                        <Users className="h-4 w-4 text-red-600" />
                    </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{memberCount}</div>
                <p className="text-xs text-slate-500 mt-1">Anggota aktif</p>
            </div>
        )}

        <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">
                    {isAdmin ? 'Pinjaman Aktif' : 'Pinjaman Saya'}
                </h3>
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center">
                    <Banknote className="h-4 w-4 text-orange-600" />
                </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{loanCount}</div>
            <p className="text-xs text-slate-500 mt-1">
                {isAdmin ? 'Total pinjaman berjalan' : 'Pinjaman berjalan'}
            </p>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">Total Outstanding</h3>
                <div className="h-8 w-8 rounded-full bg-rose-100 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-rose-600" />
                </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
                {formatCurrency(totalOutstanding)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
                {isAdmin ? 'Sisa pokok pinjaman' : 'Sisa pinjaman saya'}
            </p>
        </div>
        
        <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">Simpanan</h3>
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-emerald-600" />
                </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
                {formatCurrency(0)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total simpanan</p>
        </div>
    </div>
  );
}
