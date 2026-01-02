'use server';

import { createClient } from '@/lib/supabase/server';
import { RetailService, POSTransaction, POSTransactionItem, PaymentBreakdown } from '@/lib/services/retail-service';
import { MarketplaceService } from '@/lib/services/marketplace-service';

export async function processPosTransaction(
  transaction: Partial<POSTransaction>,
  items: Partial<POSTransactionItem>[],
  payments: PaymentBreakdown[],
  originalTransactionId?: string, // For resuming/replacing
  idempotencyKey?: string
) {
  const supabase = await createClient();
  const retailService = new RetailService(supabase);
  const marketplaceService = new MarketplaceService(supabase);

  try {
    // Auto-numbering
    if (transaction.koperasi_id && !transaction.invoice_number) {
      const settings = await retailService.getRetailSettings(transaction.koperasi_id);
      transaction.invoice_number = `${settings.sales_invoice_prefix}${Date.now()}`;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    // STAGE 3: Use Marketplace Service for Orchestration
    const result = await marketplaceService.checkoutRetail(
      transaction.koperasi_id!,
      user.id,
      transaction,
      items,
      payments,
      idempotencyKey
    );

    // If successful and there was an original transaction (e.g. Kiosk pending), cancel/delete it
    if (originalTransactionId) {
      await retailService.cancelPosTransaction(originalTransactionId);
    }

    return { success: true, data: result.operational };
  } catch (error: any) {
    console.error('POS Transaction Error:', error);
    let friendlyError = error.message;

    // Map system errors to human readable messages
    if (error.message?.includes('insufficient balance')) {
      friendlyError = 'Saldo Simpanan anggota tidak mencukupi.';
    } else if (error.message?.includes('insufficient stock')) {
      friendlyError = 'Stok produk tidak mencukupi.';
    } else if (error.message?.includes('Journal ID missing')) {
      friendlyError = 'Gagal mencatat jurnal akuntansi. Silakan coba lagi.';
    }

    return { success: false, error: friendlyError };
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
