'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Wallet, 
  Banknote, 
  BookOpen, 
  Settings,
  LogOut,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Anggota', href: '/dashboard/members', icon: Users },
  { name: 'Simpanan', href: '/dashboard/savings', icon: Wallet },
  { name: 'Pinjaman', href: '/dashboard/loans', icon: Banknote },
  { name: 'Akuntansi', href: '/dashboard/accounting', icon: BookOpen },
  { name: 'Pengaturan', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Trigger */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
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
          <div className="flex h-16 items-center px-6 border-b">
            <h1 className="text-xl font-bold text-primary">Koperasi OS</h1>
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
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer / User Profile */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 px-2">
               <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                 <Users className="h-4 w-4 text-slate-500" />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-medium text-slate-900 truncate">Admin User</p>
                 <p className="text-xs text-slate-500 truncate">admin@koperasi.id</p>
               </div>
               <button className="text-slate-400 hover:text-red-500">
                 <LogOut className="h-5 w-5" />
               </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
