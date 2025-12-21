'use server';

import { createClient } from '@/lib/supabase/server';
import { RetailService } from '@/lib/services/retail-service';
import { revalidatePath } from 'next/cache';

export async function processPosTransaction(
  transactionData: {
    koperasi_id: string;
    unit_usaha_id: string;
    member_id: string | null;
    customer_name: string;
    total_amount: number;
    discount_amount: number;
    tax_amount: number;
    final_amount: number;
    payment_method: string;
    payment_status: string;
    notes?: string;
  },
  items: {
    product_id: string;
    quantity: number;
    price_at_sale: number;
    cost_at_sale: number;
    subtotal: number;
  }[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const retailService = new RetailService(supabase);

  try {
    const result = await retailService.processTransaction(
      {
        ...transactionData,
        member_id: transactionData.member_id || undefined,
        created_by: user.id
      },
      items
    );

    revalidatePath('/dashboard/retail/pos');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('POS Transaction Error:', error);
    return { success: false, error: error.message };
  }
}

export async function searchProductByBarcode(barcode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const retailService = new RetailService(supabase);
  const koperasiId = user.user_metadata.koperasi_id;

  try {
    const product = await retailService.getProductByBarcode(koperasiId, barcode);
    return { success: true, data: product };
  } catch (error: any) {
    console.error('Search Product Error:', error);
    return { success: false, error: error.message };
  }
}
