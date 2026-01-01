import Link from 'next/link';
import { 
  ShoppingBag, 
  ShoppingCart, 
  Package, 
  Truck, 
  BarChart3, 
  Tags,
  Users,
  ClipboardList
} from 'lucide-react';

export default function RetailDashboardPage() {
  const features = [
    {
      name: 'Point of Sale (Kasir)',
      description: 'Penjualan barang ke anggota atau umum',
      href: '/dashboard/retail/pos',
      icon: ShoppingCart,
      color: 'bg-red-600',
    },
    {
      name: 'Closing Harian',
      description: 'Rekonsiliasi kas dan tutup shift',
      href: '/dashboard/retail/closing',
      icon: ClipboardList,
      color: 'bg-indigo-600',
    },
    {
      name: 'Produk',
      description: 'Kelola data barang, harga, dan stok',
      href: '/dashboard/retail/products',
      icon: Package,
      color: 'bg-emerald-500',
    },
    {
      name: 'Purchase Orders (PO)',
      description: 'Pesanan pembelian ke supplier (Pre-Order)',
      href: '/dashboard/retail/purchase-orders',
      icon: ClipboardList,
      color: 'bg-teal-500',
    },
    {
      name: 'Pembelian (Stok Masuk)',
      description: 'Input pembelian barang dari supplier',
      href: '/dashboard/retail/purchases',
      icon: ShoppingBag,
      color: 'bg-amber-500',
    },
    {
      name: 'Supplier',
      description: 'Data pemasok barang',
      href: '/dashboard/retail/suppliers',
      icon: Truck,
      color: 'bg-slate-600',
    },
    {
      name: 'Kategori',
      description: 'Kategori produk',
      href: '/dashboard/retail/categories',
      icon: Tags,
      color: 'bg-slate-500',
    },
    {
      name: 'Pelanggan Toko',
      description: 'Data pelanggan non-anggota',
      href: '/dashboard/retail/customers',
      icon: Users,
      color: 'bg-rose-500',
    },
    {
      name: 'Laporan Penjualan',
      description: 'Rekap transaksi dan keuntungan',
      href: '/dashboard/retail/reports',
      icon: BarChart3,
      color: 'bg-red-700',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Toko</h1>
        <p className="text-slate-500">Manajemen toko, stok, dan penjualan (POS)</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Link
            key={feature.name}
            href={feature.href}
            className="group relative flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-red-200"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${feature.color} text-white shadow-sm`}>
              <feature.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 group-hover:text-red-600 transition-colors">
                {feature.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {feature.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
