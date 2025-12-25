import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { DeliveryList } from '@/components/warehouse/delivery-list';

export default async function DeliveryOrderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const koperasiId = user.user_metadata.koperasi_id;
  const retailService = new RetailService(supabase);
  
  // In a real app, we would filter by "delivery_status" or similar.
  // For now, we show recent paid transactions as candidates for delivery.
  const transactions = await retailService.getPosTransactions(koperasiId, 20, 'paid');
  
  // We need to fetch items for these transactions to print them
  // The service method getPosTransactions might not return items by default if it's a list query.
  // Let's check RetailService.getPosTransactions. 
  // It does select * from pos_transactions. It doesn't join items.
  // We need to fetch items or use getPosTransactionById for each? N+1 issue.
  // Better to modify RetailService to support fetching items or fetch here.
  // Let's just fetch details for the list here manually for simplicity or assume we can fetch on demand?
  // Actually, the print function in DeliveryList needs items.
  // Let's modify the query here to include items.
  
  const { data: txWithItems } = await supabase
    .from('pos_transactions')
    .select(`
        *,
        items:pos_transaction_items(
            *,
            product:inventory_products(name, unit)
        )
    `)
    .eq('koperasi_id', koperasiId)
    .eq('payment_status', 'paid')
    .order('transaction_date', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengiriman (Delivery Order)</h1>
        <p className="text-muted-foreground">Cetak surat jalan untuk transaksi penjualan.</p>
      </div>
      <DeliveryList transactions={txWithItems || []} />
    </div>
  );
}
