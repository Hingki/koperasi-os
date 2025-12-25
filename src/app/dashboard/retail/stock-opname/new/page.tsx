import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { StockOpnameForm } from '@/components/retail/stock-opname-form';

export default async function NewStockOpnamePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  
  const products = await retailService.getProducts(koperasiId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Buat Stock Opname Baru</h1>
        <p className="text-muted-foreground">Sesuaikan stok sistem dengan fisik gudang.</p>
      </div>
      <StockOpnameForm products={products} />
    </div>
  );
}
