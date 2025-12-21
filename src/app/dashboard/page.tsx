import { createClient } from '@/lib/supabase/server';
import { Users, Wallet, Banknote, TrendingUp, ArrowRight, Building } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { koperasiService } from '@/lib/services/koperasi-service';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check user role
  const { data: roles } = await supabase
    .from('user_role')
    .select('role')
    .eq('user_id', user.id);

  const isAdmin = roles?.some(r => ['admin', 'pengurus', 'ketua', 'bendahara'].includes(r.role));

  // Fetch Core Data
  const koperasiId = user.user_metadata?.koperasi_id;
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  const koperasi = isValidUUID
    ? await koperasiService.getKoperasi(koperasiId, supabase)
    : null;
  const koperasiName = koperasi?.nama || 'Koperasi';

  // Fetch Stats (Parallel)
  let memberCount = 0;
  let loanCount = 0;
  let activeLoans: { remaining_principal: number }[] | null = [];

  if (isValidUUID && koperasiId) {
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
    activeLoans = activeLoansResult.data as { remaining_principal: number }[];
  }

  const totalOutstanding = activeLoans?.reduce((sum, loan) => sum + Number(loan.remaining_principal), 0) || 0;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {isAdmin ? 'Ringkasan Dashboard' : 'Dashboard Saya'}
          </h1>
          <p className="text-slate-500">
            Selamat datang di Sistem Manajemen <span className="font-semibold text-blue-600">{koperasiName}</span>
          </p>
        </div>
        
        {/* Setup Alert for Admin if data incomplete */}
        {isAdmin && (!koperasi?.nomor_badan_hukum || !koperasi?.alamat) && (
          <Link 
            href="/dashboard/settings"
            className="inline-flex items-center rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 ring-1 ring-inset ring-amber-600/20"
          >
            <Building className="mr-2 h-4 w-4" />
            Lengkapi Data Koperasi
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        )}
      </div>
      
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isAdmin && (
            <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <h3 className="tracking-tight text-sm font-medium text-slate-500">Total Anggota</h3>
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Users className="h-4 w-4 text-blue-600" />
                    </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{memberCount || 0}</div>
                <p className="text-xs text-slate-500 mt-1">Anggota aktif</p>
            </div>
        )}

        <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">
                    {isAdmin ? 'Pinjaman Aktif' : 'Pinjaman Saya'}
                </h3>
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Banknote className="h-4 w-4 text-green-600" />
                </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">{loanCount || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Transaksi berjalan</p>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">
                    {isAdmin ? 'Sisa Pokok (Outstanding)' : 'Sisa Pinjaman'}
                </h3>
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalOutstanding)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Total outstanding</p>
        </div>

        <div className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between space-y-0 pb-2">
                <h3 className="tracking-tight text-sm font-medium text-slate-500">
                     {isAdmin ? 'Total Simpanan' : 'Simpanan Saya'}
                </h3>
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-amber-600" />
                </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">Rp 0</div>
            <p className="text-xs text-slate-500 mt-1">Segera hadir</p>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 p-6 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-900">
                    {isAdmin ? 'Transaksi Terakhir' : 'Riwayat Transaksi'}
                </h3>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">Lihat Semua</button>
            </div>
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-lg bg-slate-50/50">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                    <Banknote className="h-5 w-5 text-slate-300" />
                </div>
                <p className="text-sm">Belum ada transaksi tercatat</p>
            </div>
        </div>
        <div className="col-span-3 p-6 bg-white rounded-xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-slate-900">
                    {isAdmin ? 'Pengajuan Baru' : 'Status Pengajuan'}
                </h3>
            </div>
             <div className="space-y-4">
                <div className="text-sm text-slate-500 italic text-center py-8 bg-slate-50 rounded-lg">
                    Tidak ada pengajuan aktif
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
