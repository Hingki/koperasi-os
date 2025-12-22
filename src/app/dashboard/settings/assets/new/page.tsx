import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AssetForm } from '@/components/settings/asset-form';

export default function NewAssetPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/settings/assets" className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Tambah Aset Baru</h1>
            <p className="text-slate-500">Input data aset tetap baru ke dalam sistem.</p>
        </div>
      </div>

      <AssetForm />
    </div>
  );
}
