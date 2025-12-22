import { MemberSidebar } from '@/components/member/member-sidebar';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NotificationPopover } from '@/components/member/notification-popover';

export default async function MemberLayout({
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
      <MemberSidebar user={user} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="flex-none h-16 flex items-center justify-end border-b bg-white px-4 md:px-8 shadow-sm z-10">
           <div className="flex items-center gap-4">
              <NotificationPopover />
           </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto pb-10">
                {children}
            </div>
        </div>
      </main>
    </div>
  );
}
