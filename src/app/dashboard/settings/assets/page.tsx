import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AssetTable } from '@/components/settings/asset-table';

export default async function AssetsPage() {
  const supabase = await createClient();

  const { data: assets } = await supabase
    .from('fixed_assets')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
            <Link href="/dashboard/settings" className="p-2 hover:bg-slate-100 rounded-full">
                <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Data Aset Barang</h1>
                <p className="text-slate-500">Kelola daftar aset tetap milik koperasi.</p>
            </div>
        </div>
        <Link href="/dashboard/settings/assets/new">
            <Button>
                <Plus className="w-4 h-4 mr-2" />
                Tambah Aset
            </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <AssetTable assets={assets || []} />
      </div>
    </div>
  );
}
