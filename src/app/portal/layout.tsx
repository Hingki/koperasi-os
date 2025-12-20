'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Wallet, Banknote, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Home', href: '/portal', icon: Home },
    { name: 'Loans', href: '/portal/loans', icon: Banknote },
    { name: 'Savings', href: '/portal/savings', icon: Wallet },
    { name: 'Profile', href: '/portal/profile', icon: User },
  ];

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-lg font-bold text-blue-600">Koperasi Mobile</h1>
        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
            <User className="w-4 h-4 text-slate-500" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {children}
      </main>

      {/* Bottom Navigation (Mobile Style) */}
      <nav className="bg-white border-t fixed bottom-0 left-0 right-0 z-20">
        <div className="flex justify-around items-center h-16">
            {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                    <Link 
                        key={item.name} 
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1",
                            isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
                        )}
                    >
                        <item.icon className={cn("w-6 h-6", isActive && "fill-current/10")} />
                        <span className="text-[10px] font-medium">{item.name}</span>
                    </Link>
                )
            })}
        </div>
      </nav>
    </div>
  );
}
