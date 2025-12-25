import { createClient } from '@/lib/supabase/server';
import { ClinicPosLayout } from '@/components/clinic/pos/clinic-pos-layout';
import { RetailService } from '@/lib/services/retail-service';

export default async function ClinicPosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  
  // Fetch products (drugs, services)
  // In a real scenario, we might want to filter by category or unit_usaha_id
  const products = await retailService.getProducts(koperasiId);

  return (
    <div className="h-[calc(100vh-4rem)]">
      <ClinicPosLayout 
        koperasiId={koperasiId} 
        initialProducts={products} 
      />
    </div>
  );
}
