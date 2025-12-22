import Link from 'next/link';
import { 
  Book, 
  FileText, 
  BarChart3, 
  CalendarRange,
  ArrowRight,
  Settings
} from 'lucide-react';

const features = [
  {
    title: 'Kode Akun (COA)',
    description: 'Kelola daftar akun akuntansi, tipe akun, dan saldo normal.',
    href: '/dashboard/accounting/coa',
    icon: Book,
    color: 'text-blue-600',
    bg: 'bg-blue-100'
  },
  {
    title: 'Jurnal Umum',
    description: 'Lihat histori jurnal dan buat jurnal penyesuaian manual.',
    href: '/dashboard/accounting/journal',
    icon: FileText,
    color: 'text-green-600',
    bg: 'bg-green-100'
  },
  {
    title: 'Buku Besar',
    description: 'Lihat detail transaksi dan mutasi per akun (Ledger).',
    href: '/dashboard/accounting/ledger',
    icon: Book,
    color: 'text-indigo-600',
    bg: 'bg-indigo-100'
  },
  {
    title: 'Laporan Keuangan',
    description: 'Lihat Neraca, Laba Rugi, dan Neraca Saldo.',
    href: '/dashboard/accounting/reports',
    icon: BarChart3,
    color: 'text-purple-600',
    bg: 'bg-purple-100'
  },
  {
    title: 'Periode Pembukuan',
    description: 'Kelola periode akuntansi, tutup buku, dan histori periode.',
    href: '/dashboard/accounting/periods',
    icon: CalendarRange,
    color: 'text-orange-600',
    bg: 'bg-orange-100'
  },
  {
    title: 'Konfigurasi',
    description: 'Lihat mapping akun sistem.',
    href: '/dashboard/accounting/config',
    icon: Settings,
    color: 'text-slate-600',
    bg: 'bg-slate-100'
  }
];

export default function AccountingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Akuntansi & Pembukuan</h1>
        <p className="text-muted-foreground">
          Pusat pengelolaan keuangan dan pelaporan akuntansi koperasi.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Link
            key={feature.title}
            href={feature.href}
            className="group relative flex flex-col gap-4 rounded-xl border p-6 hover:shadow-lg transition-all"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${feature.bg}`}>
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>
            </div>
            <p className="text-slate-600 text-sm flex-1">
              {feature.description}
            </p>
            <div className="flex items-center text-sm font-medium text-blue-600 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
              Buka Fitur <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
