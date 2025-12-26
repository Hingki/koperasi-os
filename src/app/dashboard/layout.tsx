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

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="bg-yellow-100 text-yellow-800 p-2 text-center text-xs font-mono mb-2">
            DEBUG: DEPLOYMENT v0.1.4 ACTIVE
        </div>
        <div className="max-w-7xl mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
}
