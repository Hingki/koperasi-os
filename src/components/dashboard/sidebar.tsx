'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  Banknote, 
  BookOpen, 
  Settings,
  ShoppingBag,
  MessageSquare,
  LogOut,
  Menu,
  Key,
  Package,
  Megaphone,
  Smartphone,
  Stethoscope,
  Warehouse,
  Gavel,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Anggota', href: '/dashboard/members', icon: Users, requiresAdmin: true },
  { name: 'Kepegawaian', href: '/dashboard/hrm', icon: UserCheck, requiresAdmin: true },
  { name: 'Simpanan', href: '/dashboard/savings', icon: Wallet, requiresAdmin: true },
  { name: 'Pinjaman', href: '/dashboard/pinjaman', icon: Banknote, requiresAdmin: true },
  { name: 'Pembiayaan', href: '/dashboard/financing', icon: Package, requiresAdmin: true },
  { name: 'Investasi', href: '/dashboard/investments', icon: TrendingUp, requiresAdmin: true },
  { name: 'Toko', href: '/dashboard/retail', icon: ShoppingBag, requiresAdmin: true },
  { name: 'Gudang', href: '/dashboard/warehouse', icon: Warehouse, requiresAdmin: true },
  { name: 'Lelang', href: '/dashboard/auction', icon: Gavel, requiresAdmin: true },
  { name: 'Unit Sewa', href: '/dashboard/rental', icon: Key, requiresAdmin: true },
  { name: 'Klinik', href: '/dashboard/clinic', icon: Stethoscope, requiresAdmin: true },
  { name: 'PPOB', href: '/dashboard/ppob', icon: Smartphone, requiresAdmin: true },
  { name: 'Akuntansi', href: '/dashboard/accounting', icon: BookOpen, requiresAdmin: true },
  { name: 'Pengumuman', href: '/dashboard/announcements', icon: Megaphone, requiresAdmin: true },
  { name: 'Support', href: '/dashboard/support', icon: MessageSquare, requiresAdmin: true },
  { name: 'Pengaturan', href: '/dashboard/settings', icon: Settings, requiresAdmin: true },
];

interface SidebarProps {
  user: User | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const isAuthed = !!user;

  // Fetch roles to determine admin access using useEffect

  useEffect(() => {
    let mounted = true;
    if (isAuthed && !isAdmin) {
      const checkRole = async () => {
        try {
          const { data: roles } = await supabase
            .from('user_role')
            .select('role')
            .eq('user_id', user!.id)
            .eq('is_active', true);
          const adminRoles = ['admin', 'pengurus', 'ketua', 'bendahara', 'staff'];
          const hasAdmin = !!roles?.some((r: any) => adminRoles.includes(r.role));
          if (mounted && hasAdmin) setIsAdmin(true);
        } catch (error) {
          console.error('Role check failed:', error);
        }
      };
      checkRole();
    }
    return () => { mounted = false; };
  }, [isAuthed, user, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {/* Mobile Trigger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          type="button"
          aria-label="Toggle menu"
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-white rounded-md shadow-md"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Sidebar Backdrop (Mobile) */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 px-6 border-b">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600">
              <span className="text-white font-bold text-lg">K</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">
              Koperasi <br/> Merah Putih
            </h1>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const requiresAdmin = (item as any).requiresAdmin === true;
              const disabled = !isAuthed || (requiresAdmin && !isAdmin);
              return (
                disabled ? (
                  <div
                    key={item.name}
                    aria-disabled="true"
                    className={cn(
                      "flex items-center justify-between px-4 py-3 text-sm rounded-md",
                      "text-slate-400 bg-slate-50"
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-3 h-5 w-5 text-slate-300" />
                      {item.name}
                    </div>
                    <span className="text-xs font-medium text-slate-500">{!isAuthed ? 'Butuh login' : 'Butuh akses'}</span>
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    prefetch={false}
                    className={cn(
                      "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-red-50 text-red-700"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-red-700" : "text-slate-400")} />
                    {item.name}
                  </Link>
                )
              );
            })}
          </nav>

          {/* Footer / User Profile */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-2">
               <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                 <Users className="h-4 w-4 text-red-600" />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-slate-900 truncate">
                    {user?.user_metadata?.nama_lengkap || 'Pengguna'}
                 </p>
                 <p className="text-xs text-slate-500 truncate">{user?.email}</p>
               </div>
               <button 
                type="button"
                aria-label="Keluar"
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-500 transition-colors"
                title="Keluar"
               >
                 <LogOut className="h-5 w-5" />
               </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
