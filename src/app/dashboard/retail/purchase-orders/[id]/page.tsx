import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import PODetailClient from './po-detail-client';

export default async function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: po } = await supabase
    .from('inventory_purchase_orders')
    .select(`
        *,
        supplier:inventory_suppliers(*),
        items:inventory_purchase_order_items(
            *,
            product:inventory_products(*)
        )
    `)
    .eq('id', params.id)
    .single();

  if (!po) {
      notFound();
  }

  return <PODetailClient po={po} />;
}
