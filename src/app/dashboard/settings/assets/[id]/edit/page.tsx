import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AssetForm } from '@/components/settings/asset-form';
import { notFound } from 'next/navigation';

export default async function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: asset } = await supabase
    .from('fixed_assets')
    .select('*')
    .eq('id', id)
    .single();

  if (!asset) {
    return notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/settings/assets" className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Aset</h1>
            <p className="text-slate-500">Perbarui informasi aset.</p>
        </div>
      </div>

      <AssetForm initialData={asset} />
    </div>
  );
}
