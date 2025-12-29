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
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  FileText,
  CreditCard,
  Building2,
  Globe,
  Database,
  Lock,
  Network,
  CalendarRange,
  Coins,
  History,
  Sliders,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// Define the navigation structure based on "Koperasi OS Core Architecture"
type NavItem = {
  name: string;
  href: string;
  icon: any;
  requiresAdmin?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const navigation: NavSection[] = [
  {
    title: 'GOVERNANCE', // Level 0
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Profil Koperasi', href: '/dashboard/governance/profile', icon: Building2, requiresAdmin: true },
      { name: 'Struktur Organisasi', href: '/dashboard/governance/structure', icon: Network, requiresAdmin: true },
      { name: 'Pengurus & Pengawas', href: '/dashboard/governance/board', icon: Users, requiresAdmin: true },
      { name: 'Anggota', href: '/dashboard/members', icon: Users, requiresAdmin: false },
      { name: 'Hak Akses & Role', href: '/dashboard/governance/roles', icon: ShieldCheck, requiresAdmin: true },
      { name: 'Tahun Buku', href: '/dashboard/governance/fiscal-year', icon: CalendarRange, requiresAdmin: true },
      { name: 'RAT & Dokumen Legal', href: '/dashboard/governance/legal', icon: FileText, requiresAdmin: true },
    ]
  },
  {
    title: 'KEUANGAN (CORE)', // Level 1
    items: [
      { name: 'Chart of Accounts (COA)', href: '/dashboard/accounting/coa', icon: BookOpen, requiresAdmin: true },
      { name: 'Saldo Awal', href: '/dashboard/accounting/opening-balance', icon: Coins, requiresAdmin: true },
      { name: 'Jurnal Umum', href: '/dashboard/accounting/journal', icon: FileText, requiresAdmin: true },
      { name: 'Buku Besar', href: '/dashboard/accounting/ledger', icon: BookOpen, requiresAdmin: true },
      { name: 'Penutupan Periode', href: '/dashboard/accounting/closing', icon: History, requiresAdmin: true },
      { name: 'Laporan Keuangan', href: '/dashboard/accounting/reports', icon: TrendingUp, requiresAdmin: true },
    ]
  },
  {
    title: 'UNIT SIMPAN PINJAM', // Level 2
    items: [
      { name: 'Pengaturan Produk', href: '/dashboard/usp/products', icon: Sliders, requiresAdmin: true },
      { name: 'Simpanan', href: '/dashboard/savings', icon: Wallet, requiresAdmin: false },
      { name: 'Pinjaman', href: '/dashboard/pinjaman', icon: Banknote, requiresAdmin: false },
      { name: 'Agunan', href: '/dashboard/collateral', icon: Key, requiresAdmin: true },
    ]
  },
  {
    title: 'TELLER & OPERASIONAL', // Level 3
    items: [
      { name: 'Kas Awal', href: '/dashboard/teller/initial-cash', icon: Coins, requiresAdmin: true },
      { name: 'Kas Masuk', href: '/dashboard/teller/cash-in', icon: ArrowDownCircle, requiresAdmin: false },
      { name: 'Kas Keluar', href: '/dashboard/teller/cash-out', icon: ArrowUpCircle, requiresAdmin: false },
      { name: 'Validasi Transaksi', href: '/dashboard/teller/validation', icon: CheckCircle2, requiresAdmin: true },
      { name: 'Tutup Kas Harian', href: '/dashboard/teller/closing', icon: Lock, requiresAdmin: true },
    ]
  },
  {
    title: 'UNIT USAHA', // Level 4
    items: [
      { name: 'Toko Retail', href: '/dashboard/retail', icon: ShoppingBag, requiresAdmin: false },
      { name: 'Gudang', href: '/dashboard/warehouse', icon: Warehouse, requiresAdmin: false },
      { name: 'Klinik', href: '/dashboard/clinic', icon: Stethoscope, requiresAdmin: false },
      { name: 'PPOB', href: '/dashboard/ppob', icon: Smartphone, requiresAdmin: false },
      { name: 'Lelang', href: '/dashboard/auction', icon: Gavel, requiresAdmin: false },
      { name: 'Unit Sewa', href: '/dashboard/rental', icon: Key, requiresAdmin: false },
    ]
  },
  {
    title: 'DIGITAL & SYSTEM', // Level 5 & 6
    items: [
      { name: 'Website CMS', href: '/dashboard/cms', icon: Globe, requiresAdmin: true },
      { name: 'Pengaturan Sistem', href: '/dashboard/settings', icon: Settings, requiresAdmin: true },
      { name: 'Audit Log', href: '/dashboard/system/audit', icon: Database, requiresAdmin: true },
    ]
  }
];

interface SidebarProps {
  user: User | null;
  isAdmin?: boolean;
  coaReady?: boolean;
  periodLocked?: boolean;
}

export function Sidebar({ user, isAdmin = false, coaReady = true, periodLocked = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const supabase = createClient();
  const isAuthed = !!user;

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
              Koperasi <br /> Merah Putih
            </h1>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto">
            {navigation.map((section) => (
              <div key={section.title}>
                <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const isJournal = item.href.startsWith('/dashboard/accounting/journal');
                    const disabled = !isAuthed || (item.requiresAdmin && !isAdmin) || (isJournal && (!coaReady || periodLocked));

                    return disabled ? (
                      <div
                        key={item.name}
                        aria-disabled="true"
                        className={cn(
                          "flex items-center justify-between px-2 py-2 text-sm rounded-md",
                          "text-slate-400 bg-slate-50 opacity-60"
                        )}
                      >
                        <div className="flex items-center">
                          <item.icon className="mr-3 h-4 w-4 text-slate-300" />
                          {item.name}
                        </div>
                        {(item.requiresAdmin || isJournal) && (
                          <Lock className="h-3 w-3 text-slate-300" />
                        )}
                      </div>
                    ) : (
                      <Link
                        key={item.name}
                        href={item.href}
                        prefetch={false}
                        className={cn(
                          "flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                          isActive
                            ? "bg-red-50 text-red-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        <item.icon className={cn("mr-3 h-4 w-4", isActive ? "text-red-700" : "text-slate-400")} />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
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
