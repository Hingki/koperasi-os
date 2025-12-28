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
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const adminRoles = ['admin', 'pengurus', 'ketua', 'bendahara', 'staff'];
  const isAdmin = roles?.some(r => adminRoles.includes(r.role)) || false;

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} isAdmin={isAdmin} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
}
