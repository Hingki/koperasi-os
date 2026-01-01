'use server';

import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { MarketplaceService } from '@/lib/services/marketplace-service';
import { revalidatePath } from 'next/cache';

export async function createPurchaseOrderAction(payload: {
  koperasi_id: string;
  supplier_id: string;
  notes?: string;
  items: {
    product_id: string;
    quantity: number;
    cost_per_item: number;
  }[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const retailService = new RetailService(supabase);
  
  // Helper to get unit usaha
  const { data: unitUsaha } = await supabase
    .from('unit_usaha')
    .select('id')
    .eq('koperasi_id', payload.koperasi_id)
    .limit(1)
    .single();

  // Auto-generate PO Number
  // In a real app, this should be configurable. 
  // For now: PO-YYYYMMDD-TIMESTAMP
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const poNumber = `PO-${dateStr}-${Math.floor(Date.now() / 1000).toString().slice(-4)}`;

  const totalAmount = payload.items.reduce((sum, item) => sum + (item.quantity * item.cost_per_item), 0);

  const po = await retailService.createPurchaseOrder(
    {
      koperasi_id: payload.koperasi_id,
      unit_usaha_id: unitUsaha?.id,
      supplier_id: payload.supplier_id,
      po_number: poNumber,
      status: 'ordered', // Direct to ordered for now, skip draft if simple
      total_amount: totalAmount,
      notes: payload.notes,
      created_by: user.id
    },
    payload.items.map(item => ({
        product_id: item.product_id,
        quantity_ordered: item.quantity,
        cost_per_item: item.cost_per_item,
        subtotal: item.quantity * item.cost_per_item
    }))
  );

  revalidatePath('/dashboard/retail/purchase-orders');
  return { success: true, data: po };
}

export async function receivePurchaseOrderAction(
    poId: string, 
    invoiceNumber: string,
    items: { product_id: string; quantity: number }[]
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
  
    if (!user) throw new Error('Unauthorized');
  
    const retailService = new RetailService(supabase);
    const marketplaceService = new MarketplaceService(supabase);

    try {
        // 1. Fetch PO Details
        const po = await retailService.getPurchaseOrderById(poId);
        if (!po) throw new Error('PO not found');
        if (po.status === 'received') throw new Error('Purchase Order already received');

        // 2. Prepare Purchase Items
        let totalAmount = 0;
        const purchaseItems = items.map(ri => {
            const poItem = po.items.find((i: any) => i.product_id === ri.product_id);
            const cost = poItem ? poItem.cost_per_item : 0;
            const subtotal = cost * ri.quantity;
            totalAmount += subtotal;

            return {
                product_id: ri.product_id,
                quantity: ri.quantity,
                cost_per_item: cost,
                subtotal: subtotal
            };
        });

        // 3. Process Purchase via MarketplaceService (Ledger + Operational)
        await marketplaceService.processPurchase({
            koperasi_id: po.koperasi_id,
            unit_usaha_id: po.unit_usaha_id,
            supplier_id: po.supplier_id,
            invoice_number: invoiceNumber,
            total_amount: totalAmount,
            payment_status: 'debt', // PO is usually debt/AP
            notes: `Received from PO ${po.po_number}`,
            created_by: user.id,
            po_id: po.id
        }, purchaseItems);

        // 4. Update PO Status
        await retailService.updatePurchaseOrderStatus(poId, 'received', user.id);

        revalidatePath('/dashboard/retail/purchase-orders');
        revalidatePath('/dashboard/retail/purchases');
        revalidatePath('/dashboard/retail/stock');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
