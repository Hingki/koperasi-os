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
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Anggota', href: '/dashboard/members', icon: Users },
  { name: 'Kepegawaian', href: '/dashboard/hrm', icon: UserCheck },
  { name: 'Simpanan', href: '/dashboard/savings', icon: Wallet },
  { name: 'Pinjaman', href: '/dashboard/pinjaman', icon: Banknote },
  { name: 'Pembiayaan', href: '/dashboard/financing', icon: Package },
  { name: 'Investasi', href: '/dashboard/investments', icon: TrendingUp },
  { name: 'Toko', href: '/dashboard/retail', icon: ShoppingBag },
  { name: 'Gudang', href: '/dashboard/warehouse', icon: Warehouse },
  { name: 'Lelang', href: '/dashboard/auction', icon: Gavel },
  { name: 'Unit Sewa', href: '/dashboard/rental', icon: Key },
  { name: 'Klinik', href: '/dashboard/clinic', icon: Stethoscope },
  { name: 'PPOB', href: '/dashboard/ppob', icon: Smartphone },
  { name: 'Akuntansi', href: '/dashboard/accounting', icon: BookOpen },
  { name: 'Pengumuman', href: '/dashboard/announcements', icon: Megaphone },
  { name: 'Support', href: '/dashboard/support', icon: MessageSquare },
  { name: 'Pengaturan', href: '/dashboard/settings', icon: Settings },
];

interface SidebarProps {
  user: User | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();

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
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
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
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-blue-700" : "text-slate-400")} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer / User Profile */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-2">
               <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                 <Users className="h-4 w-4 text-blue-600" />
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
