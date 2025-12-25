import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { CheckInForm } from '@/components/warehouse/check-in-form';

export default async function WarehouseCheckInPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  
  const suppliers = await retailService.getSuppliers(koperasiId);
  const products = await retailService.getProducts(koperasiId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Penerimaan & Penimbangan Barang</h1>
        <p className="text-muted-foreground">Catat barang masuk dari supplier/petani dengan penimbangan.</p>
      </div>
      <CheckInForm suppliers={suppliers} products={products} />
    </div>
  );
}
