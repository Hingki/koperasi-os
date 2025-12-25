import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';

import { revalidatePath } from 'next/cache';

export default async function NewCategoryPage() {
  async function createCategory(formData: FormData) {
    'use server';
    
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    
    const retailService = new RetailService(supabase);
    const koperasiId = user.user_metadata.koperasi_id;

    if (!koperasiId) throw new Error('Invalid Koperasi ID');

    // Helper to get unit usaha
    const { data: unitUsaha } = await supabase
        .from('unit_usaha')
        .select('id')
        .eq('koperasi_id', koperasiId)
        .limit(1)
        .single();

    await retailService.createCategory({
      koperasi_id: koperasiId,
      unit_usaha_id: unitUsaha?.id,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      is_active: true
    });

    revalidatePath('/dashboard/retail/categories');
    redirect('/dashboard/retail/categories');
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/retail/categories">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tambah Kategori</h1>
          <p className="text-sm text-slate-500">Buat kategori produk baru</p>
        </div>
      </div>

      <form action={createCategory} className="space-y-6 bg-white p-6 rounded-lg border shadow-sm">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Nama Kategori <span className="text-red-500">*</span></label>
          <Input id="name" name="name" required placeholder="Contoh: Makanan Ringan" />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">Deskripsi</label>
          <Textarea id="description" name="description" placeholder="Keterangan tambahan..." />
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Link href="/dashboard/retail/categories">
            <Button variant="outline" type="button">Batal</Button>
          </Link>
          <Button type="submit">Simpan Kategori</Button>
        </div>
      </form>
    </div>
  );
}
