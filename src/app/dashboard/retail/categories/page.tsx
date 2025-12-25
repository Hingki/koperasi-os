import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import Link from 'next/link';
import { Plus, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  const categories = isValidUUID 
    ? await retailService.getCategories(koperasiId) 
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Kategori Barang</h1>
          <p className="text-sm text-slate-500">
            Kelompokkan produk untuk memudahkan pengelolaan
          </p>
        </div>
        <Link href="/dashboard/retail/categories/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Kategori Baru
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((category: any) => (
          <div key={category.id} className="bg-white p-6 rounded-lg border shadow-sm flex flex-col items-center text-center space-y-4 hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <Folder className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-slate-500 mt-1">{category.description}</p>
              )}
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-dashed">
            Belum ada kategori.
          </div>
        )}
      </div>
    </div>
  );
}
