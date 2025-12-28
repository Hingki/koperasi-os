import { createClient } from '@/lib/supabase/server';
import { ArrowRight, Building, Key } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { koperasiService } from '@/lib/services/koperasi-service';
import { Suspense } from 'react';
import { DashboardStats } from './dashboard-stats';
import { Skeleton } from '@/components/ui/skeleton';
import { ClaimAdminButton } from '@/components/dashboard/claim-admin-button';

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

  const adminRoles = ['admin', 'pengurus', 'ketua', 'bendahara', 'staff'];
  const isAdmin = roles?.some(r => adminRoles.includes(r.role)) || false;

  // Fetch Core Data (Koperasi Info) - Keep this blocking as it's essential for context
  const koperasiId = user.user_metadata?.koperasi_id;
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  const koperasi = isValidUUID
    ? await koperasiService.getKoperasi(koperasiId, supabase)
    : null;
  const koperasiName = koperasi?.nama || 'Koperasi';

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            {isAdmin ? 'Ringkasan Dashboard' : 'Dashboard Saya'}
          </h1>
          <p className="text-slate-500">
            Selamat datang di Sistem Manajemen <span className="font-semibold text-red-600">{koperasiName}</span>
          </p>
        </div>
        
        {/* Setup Alert for Admin if data incomplete */}
        {isAdmin && (!koperasi?.nomor_badan_hukum || !koperasi?.alamat) && (
          <Link 
            href="/dashboard/settings"
            prefetch={false}
            className="inline-flex items-center rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 ring-1 ring-inset ring-amber-600/20"
          >
            <Building className="mr-2 h-4 w-4" />
            Lengkapi Data Koperasi
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        )}

        {/* Dev Helper: Always show Claim Admin Access button if not admin, for debugging */}
        {!isAdmin && (
           <ClaimAdminButton />
        )}
      </div>
      
      {/* Stats Grid with Suspense */}
      <Suspense fallback={<StatsGridSkeleton />}>
        <DashboardStats koperasiId={koperasiId} isAdmin={isAdmin} />
      </Suspense>
      
      {/* Placeholder for future charts/tables */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 h-[400px] rounded-xl bg-slate-50/50 border border-dashed border-slate-200 flex items-center justify-center text-slate-400">
            Chart Area (Coming Soon)
        </div>
        <div className="col-span-3 h-[400px] rounded-xl bg-slate-50/50 border border-dashed border-slate-200 flex items-center justify-center text-slate-400">
            Recent Activity (Coming Soon)
        </div>
      </div>
      
      {/* Version Indicator */}
      <div className="text-center text-xs text-slate-300 pb-4">
        v0.1.6-secure
      </div>
    </div>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-6 bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-8 w-16 mt-2" />
          <Skeleton className="h-3 w-32 mt-1" />
        </div>
      ))}
    </div>
  );
}
