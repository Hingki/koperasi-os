'use server';

import { createClient } from '@/lib/supabase/server';
import { RetailService, POSTransaction, POSTransactionItem, PaymentBreakdown } from '@/lib/services/retail-service';

export async function processPosTransaction(
  transaction: Partial<POSTransaction>,
  items: Partial<POSTransactionItem>[],
  payments: PaymentBreakdown[],
  originalTransactionId?: string // For resuming/replacing
) {
  const supabase = await createClient();
  const retailService = new RetailService(supabase);

  try {
    // Auto-numbering
    if (transaction.koperasi_id && !transaction.invoice_number) {
        const settings = await retailService.getRetailSettings(transaction.koperasi_id);
        transaction.invoice_number = `${settings.sales_invoice_prefix}${Date.now()}`;
    }

    const result = await retailService.processTransaction(transaction, items, payments);

    // If successful and there was an original transaction (e.g. Kiosk pending), cancel/delete it
    if (originalTransactionId) {
        await retailService.cancelPosTransaction(originalTransactionId);
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error('POS Transaction Error:', error);
    return { success: false, error: error.message };
  }
}

export async function searchProducts(koperasiId: string, query: string) {
  const supabase = await createClient();
  const retailService = new RetailService(supabase);
  return retailService.getProducts(koperasiId, query);
}

export async function searchMembers(koperasiId: string, query: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('members')
        .select('id, name, member_number, phone')
        .eq('koperasi_id', koperasiId)
        .ilike('name', `%${query}%`)
        .limit(10);
    
    if (error) throw error;
    return data;
}

export async function searchRetailCustomers(koperasiId: string, query: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('retail_customers')
        .select('id, name, phone, address')
        .eq('koperasi_id', koperasiId)
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .limit(10);
    
    if (error) throw error;
    return data;
}
