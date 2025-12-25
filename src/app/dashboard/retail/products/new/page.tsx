import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ProductForm } from './product-form';

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);

  // Validate UUID
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);
  
  // Fetch categories and suppliers
  const [categories, suppliers] = await Promise.all([
    isValidUUID ? retailService.getCategories(koperasiId) : [],
    isValidUUID ? retailService.getSuppliers(koperasiId) : []
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/retail/products">
          <Button variant="ghost" size="icon" aria-label="Kembali">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tambah Produk</h1>
          <p className="text-sm text-slate-500">Input data barang baru</p>
        </div>
      </div>

      <ProductForm 
        categories={categories} 
        suppliers={suppliers} 
        koperasiId={koperasiId} 
      />
    </div>
  );
}
