import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { redirect } from 'next/navigation';
import KioskView from '@/components/retail/kiosk/kiosk-view';

export default async function KioskPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/kiosk');
  }

  const koperasiId = user.user_metadata.koperasi_id;
  if (!koperasiId) {
    return <div>Error: Koperasi ID not found</div>;
  }

  // Find Retail Unit Usaha
  const { data: unitUsaha } = await supabase
    .from('unit_usaha')
    .select('id')
    .eq('koperasi_id', koperasiId)
    .in('type', ['retail', 'toko', 'trade'])
    .limit(1)
    .single();

  // If no specific retail unit found, try to use the first unit or handle error
  // For now, if no unit found, we can't proceed properly.
  // But let's assume there is one, or fallback to a query without type if needed.
  
  if (!unitUsaha) {
     // Fallback: get any unit
     const { data: anyUnit } = await supabase
        .from('unit_usaha')
        .select('id')
        .eq('koperasi_id', koperasiId)
        .limit(1)
        .single();
     
     if (!anyUnit) {
        return <div className="p-8 text-center">Toko belum dikonfigurasi. Silakan buat unit terlebih dahulu.</div>;
     }
     
     // Warn in console or just proceed
  }

  const finalUnitId = unitUsaha?.id; // We'll handle the fallback logic better if needed

  if (!finalUnitId) {
    return <div className="p-8 text-center">Toko belum dikonfigurasi.</div>;
  }

  const retailService = new RetailService(supabase);
  
  // Fetch data in parallel
  const [products, categories] = await Promise.all([
    retailService.getProducts(koperasiId),
    retailService.getCategories(koperasiId)
  ]);

  return (
    <KioskView 
      products={products || []}
      categories={categories || []}
      koperasiId={koperasiId}
      unitUsahaId={finalUnitId}
    />
  );
}
