import { Sidebar } from '@/components/dashboard/sidebar';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check user role serverside
  const { data: roles } = await supabase
    .from('user_role')
    .select('role, koperasi_id')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const adminRoles = ['admin', 'pengurus', 'ketua', 'bendahara', 'staff', 'wakil_ketua_usaha', 'wakil_ketua_keanggotaan'];
  const isAdmin = roles?.some(r => adminRoles.includes(r.role)) || false;
  const koperasiId = roles?.[0]?.koperasi_id;

  // Check COA and Period status server-side
  let coaReady = true;
  let periodLocked = false;

  if (koperasiId) {
    const { count } = await supabase
      .from('accounts')
      .select('id', { count: 'exact', head: true })
      .eq('koperasi_id', koperasiId);
    
    // If count is null (error) or 0, then not ready
    coaReady = (count || 0) > 0;

    const today = new Date().toISOString().split('T')[0];
    const { data: period } = await supabase
      .from('accounting_periods')
      .select('is_closed')
      .eq('koperasi_id', koperasiId)
      .lte('start_date', today)
      .gte('end_date', today)
      .maybeSingle();
    
    periodLocked = !!period?.is_closed;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} isAdmin={isAdmin} coaReady={coaReady} periodLocked={periodLocked} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
}
