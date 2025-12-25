import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { redirect } from 'next/navigation';
import POForm from './po-form';

export default async function NewPurchaseOrderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  const isValidUUID = koperasiId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(koperasiId);

  if (!isValidUUID) {
      return <div>Invalid Koperasi ID</div>;
  }

  const [products, suppliers] = await Promise.all([
    retailService.getProducts(koperasiId),
    retailService.getSuppliers(koperasiId)
  ]);

  return (
    <POForm 
      suppliers={suppliers} 
      products={products} 
      koperasiId={koperasiId}
    />
  );
}
