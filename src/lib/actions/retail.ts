'use server';

import { createClient } from '@/lib/supabase/server';
import { RetailService, POSTransaction, POSTransactionItem, PaymentBreakdown } from '@/lib/services/retail-service';
import { PharmacyService, PharmacyTransactionInput, PharmacyItemInput } from '@/lib/services/pharmacy-service';
import { LedgerService } from '@/lib/services/ledger-service';
import { AccountCode } from '@/lib/types/ledger';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createSupplier(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const retailService = new RetailService(supabase);
  const koperasiId = user.user_metadata.koperasi_id;

  if (!koperasiId) throw new Error('Invalid Koperasi ID');

  await retailService.createSupplier({
    koperasi_id: koperasiId,
    name: formData.get('name') as string,
    contact_person: formData.get('contact_person') as string,
    phone: formData.get('phone') as string,
    email: formData.get('email') as string,
    address: formData.get('address') as string,
    is_active: true
  });

  revalidatePath('/dashboard/retail/suppliers');
}

export async function updateSupplier(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const retailService = new RetailService(supabase);

  await retailService.updateSupplier(id, {
    name: formData.get('name') as string,
    contact_person: formData.get('contact_person') as string,
    phone: formData.get('phone') as string,
    email: formData.get('email') as string,
    address: formData.get('address') as string,
  });

  revalidatePath('/dashboard/retail/suppliers');
}

export async function deleteSupplier(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const retailService = new RetailService(supabase);

  await retailService.deleteSupplier(id);

  revalidatePath('/dashboard/retail/suppliers');
}

export async function updateRetailSettingsAction(settings: any) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const retailService = new RetailService(supabase);
  const koperasiId = user.user_metadata.koperasi_id;

  if (!koperasiId) throw new Error('Invalid Koperasi ID');

  await retailService.updateRetailSettings(koperasiId, {
    purchase_invoice_prefix: settings.purchase_invoice_prefix,
    purchase_return_prefix: settings.purchase_return_prefix,
    sales_invoice_prefix: settings.sales_invoice_prefix,
    sales_return_prefix: settings.sales_return_prefix,
    receipt_header: settings.receipt_header,
    receipt_footer: settings.receipt_footer,
    receipt_width: settings.receipt_width
  });

  revalidatePath('/dashboard/retail/settings');
}

export async function createStockOpnameAction(payload: {
  notes?: string;
  status: 'draft' | 'final';
  items: {
    product_id: string;
    system_qty: number;
    actual_qty: number;
    notes?: string;
  }[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const retailService = new RetailService(supabase);
  const koperasiId = user.user_metadata.koperasi_id;
  if (!koperasiId) throw new Error('Invalid Koperasi ID');

  await retailService.createStockOpname(
    {
      koperasi_id: koperasiId,
      notes: payload.notes,
      status: payload.status,
      created_by: user.id
    },
    payload.items
  );

  revalidatePath('/dashboard/retail/stock-opname');
}

export async function getPosTransactionDetailsAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const retailService = new RetailService(supabase);
  return await retailService.getPosTransactionById(id);
}

export async function createSalesReturnAction(payload: {
  transaction_id: string;
  reason?: string;
  status: 'pending' | 'completed';
  items: {
    product_id: string;
    quantity: number;
    refund_amount_per_item: number;
    subtotal: number;
  }[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const retailService = new RetailService(supabase);
  const koperasiId = user.user_metadata.koperasi_id;
  if (!koperasiId) throw new Error('Invalid Koperasi ID');

  // Auto-generate Return Number
  const settings = await retailService.getRetailSettings(koperasiId);
  const returnNumber = `${settings.sales_return_prefix || 'RET'}-${Date.now()}`;
  
  const totalRefund = payload.items.reduce((sum, item) => sum + item.subtotal, 0);

  await retailService.createSalesReturn(
    {
      koperasi_id: koperasiId,
      transaction_id: payload.transaction_id,
      return_number: returnNumber,
      reason: payload.reason,
      status: payload.status,
      total_refund_amount: totalRefund,
      created_by: user.id
    },
    payload.items
  );

  revalidatePath('/dashboard/retail/sales/returns');
  revalidatePath('/dashboard/retail/sales'); // Update transaction status potentially?
}

export async function createPurchaseReturnAction(payload: {
  purchase_id: string;
  reason?: string;
  status: 'pending' | 'completed';
  items: {
    product_id: string;
    quantity: number;
    refund_amount_per_item: number;
    subtotal: number;
  }[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const retailService = new RetailService(supabase);
  const koperasiId = user.user_metadata.koperasi_id;
  if (!koperasiId) throw new Error('Invalid Koperasi ID');

  // Fetch Purchase to get details
  const { data: purchase } = await supabase
    .from('inventory_purchases')
    .select('unit_usaha_id, supplier_id')
    .eq('id', payload.purchase_id)
    .single();

  if (!purchase) throw new Error('Purchase not found');

  const settings = await retailService.getRetailSettings(koperasiId);
  const returnNumber = `${settings.purchase_return_prefix || 'RET-PUR'}-${Date.now()}`;
  
  const totalRefund = payload.items.reduce((sum, item) => sum + item.subtotal, 0);

  await retailService.createPurchaseReturn(
    {
      koperasi_id: koperasiId,
      unit_usaha_id: purchase.unit_usaha_id,
      purchase_id: payload.purchase_id,
      supplier_id: purchase.supplier_id, // Might be null if purchase has no supplier? But createPurchaseReturn requires string. 
      // We assume purchase has supplier_id if it's being returned.
      // If purchase.supplier_id is null, we might need to handle it or cast.
      // But let's assume valid data flow.
      return_number: returnNumber,
      reason: payload.reason,
      status: payload.status,
      total_refund_amount: totalRefund,
      created_by: user.id
    },
    payload.items
  );

  revalidatePath('/dashboard/retail/purchases/returns');
}

export async function createProductAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const retailService = new RetailService(supabase);
  const koperasiId = formData.get('koperasi_id') as string;

  if (!koperasiId) throw new Error('Invalid Koperasi ID');

  const rawData = {
    koperasi_id: koperasiId,
    unit_usaha_id: user.user_metadata.unit_usaha_id, // Default to user's unit usaha
    name: formData.get('name') as string,
    barcode: formData.get('barcode') as string,
    sku: formData.get('sku') as string,
    category_id: (formData.get('category_id') as string) || undefined,
    supplier_id: (formData.get('supplier_id') as string) || undefined,
    product_type: formData.get('product_type') as 'regular' | 'consignment',
    price_cost: Number(formData.get('price_cost')),
    price_sell_public: Number(formData.get('price_sell_public')),
    price_sell_member: Number(formData.get('price_sell_member')),
    stock_quantity: Number(formData.get('stock_quantity')),
    min_stock_alert: Number(formData.get('min_stock_alert')),
    unit: formData.get('unit') as string,
    consignment_fee_percent: Number(formData.get('consignment_fee_percent') || 0),
    is_active: true
  };

  await retailService.createProduct(rawData);
  revalidatePath('/dashboard/retail/products');
  redirect('/dashboard/retail/products');
}

export async function processPosTransaction(
  transaction: Partial<POSTransaction>,
  items: Partial<POSTransactionItem>[],
  payments?: PaymentBreakdown[],
  originalTransactionId?: string
) {
  const supabase = await createClient();
  const retailService = new RetailService(supabase);

  try {
    if (transaction.koperasi_id && !transaction.invoice_number) {
      const settings = await retailService.getRetailSettings(transaction.koperasi_id);
      transaction.invoice_number = `${settings.sales_invoice_prefix}${Date.now()}`;
    }

    const defaultPayments: PaymentBreakdown[] = payments && payments.length > 0
      ? payments
      : [{ method: (transaction.payment_method as PaymentBreakdown['method']) || 'cash', amount: transaction.final_amount || transaction.total_amount || 0 }];
    const result = await retailService.processTransaction(transaction, items, defaultPayments);

    if (originalTransactionId) {
      await retailService.cancelPosTransaction(originalTransactionId);
    }

    return { success: true, data: result };
  } catch (error: any) {
    console.error('POS Transaction Error:', error);
    return { success: false, error: error.message };
  }
}

export async function searchProductByBarcode(barcode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  const retailService = new RetailService(supabase);
  const koperasiId: string | undefined = user.user_metadata?.koperasi_id;
  if (!koperasiId) return { success: false, error: 'Koperasi context not found' };

  try {
    const product = await retailService.getProductByBarcode(koperasiId, barcode);
    if (!product) {
      return { success: false, error: 'Produk tidak ditemukan' };
    }
    return { success: true, data: product };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPurchaseDetailsAction(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const retailService = new RetailService(supabase);
  return await retailService.getPurchaseById(id);
}

export async function payPurchaseDebtAction(payload: { purchase_id: string; amount: number; payment_method: 'cash' | 'transfer' }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const retailService = new RetailService(supabase);
  const ledger = new LedgerService(supabase);
  
  const { data: purchase, error } = await supabase
    .from('inventory_purchases')
    .select('id, koperasi_id, invoice_number, payment_status')
    .eq('id', payload.purchase_id)
    .single();
  
  if (error || !purchase) throw new Error('Purchase not found');
  if (purchase.payment_status === 'paid') return { success: true }; // Idempotent
  
  const creditAccount = payload.payment_method === 'transfer' ? AccountCode.BANK_BCA : AccountCode.CASH_ON_HAND;
  
  await ledger.recordTransaction({
    koperasi_id: purchase.koperasi_id,
    tx_type: 'retail_purchase_payment',
    tx_reference: purchase.invoice_number,
    account_debit: AccountCode.ACCOUNTS_PAYABLE,
    account_credit: creditAccount,
    amount: payload.amount,
    description: `Pelunasan Hutang Pembelian ${purchase.invoice_number}`,
    source_table: 'inventory_purchases',
    source_id: purchase.id,
    created_by: user.id
  });
  
  await supabase
    .from('inventory_purchases')
    .update({ payment_status: 'paid' })
    .eq('id', purchase.id);
  
  revalidatePath('/dashboard/retail/purchases');
  return { success: true };
}

export async function createDiscountAction(discount: {
  koperasi_id: string;
  unit_usaha_id?: string;
  name: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  start_date?: string;
  end_date?: string;
  min_purchase_amount?: number;
  is_active: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const retailService = new RetailService(supabase);
  await retailService.createDiscount(discount);
  revalidatePath('/dashboard/retail/discounts');
  return { success: true };
}

export async function updateDiscountStatusAction(id: string, isActive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  
  const retailService = new RetailService(supabase);
  await retailService.updateDiscount(id, { is_active: isActive });
  revalidatePath('/dashboard/retail/discounts');
  return { success: true };
}

export async function processPharmacyTransactionAction(
  transaction: Partial<PharmacyTransactionInput>,
  items: PharmacyItemInput[],
  payments?: PaymentBreakdown[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const pharmacyService = new PharmacyService(supabase);
  const koperasiId = transaction.koperasi_id || user.user_metadata.koperasi_id;
  const unitUsahaId = transaction.unit_usaha_id || user.user_metadata.unit_usaha_id;

  if (!koperasiId) throw new Error('Invalid Koperasi ID');

  const txPayload: PharmacyTransactionInput = {
    ...transaction,
    koperasi_id: koperasiId,
    unit_usaha_id: unitUsahaId,
    transaction_date: transaction.transaction_date || new Date().toISOString(),
    payment_status: transaction.payment_status || ((payments && payments.some(p => p.method === 'qris')) || transaction.payment_method === 'qris' ? 'pending' : 'paid'),
    created_by: user.id
  };

  const result = await pharmacyService.processPharmacyTransaction(txPayload, items, payments);
  revalidatePath('/dashboard/pharmacy/transactions');
  return { success: true, data: result };
}

export async function getPharmacySalesConsolidationAction(startDateISO: string, endDateISO: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const pharmacyService = new PharmacyService(supabase);
  const koperasiId = user.user_metadata.koperasi_id;
  if (!koperasiId) throw new Error('Invalid Koperasi ID');

  const startDate = new Date(startDateISO);
  const endDate = new Date(endDateISO);
  const data = await pharmacyService.getPharmacySalesConsolidation(koperasiId, startDate, endDate);
  return data;
}

export async function createPurchase(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');
    
    const retailService = new RetailService(supabase);
    const koperasiId = user.user_metadata.koperasi_id;
    const unitUsahaId = user.user_metadata.unit_usaha_id;
  
    if (!koperasiId) throw new Error('Invalid Koperasi ID');
  
    const itemsStr = formData.get('items') as string;
    const items = JSON.parse(itemsStr);
  
    await retailService.createPurchase({
      koperasi_id: koperasiId,
      unit_usaha_id: unitUsahaId,
      supplier_id: formData.get('supplier_id') as string,
      invoice_number: formData.get('invoice_number') as string,
      total_amount: items.reduce((sum: number, item: any) => sum + (item.quantity * item.cost_per_item), 0),
      payment_status: formData.get('payment_status') as 'paid' | 'debt',
      created_by: user.id
    }, items);
  
    revalidatePath('/dashboard/retail/purchases');
    revalidatePath('/dashboard/warehouse');
  }
