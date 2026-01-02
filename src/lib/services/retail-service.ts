import { SupabaseClient } from '@supabase/supabase-js';
import { PaymentService } from './payment-service';
import { SavingsService } from './savings-service';
import { LoyaltyService } from './loyalty-service';

export interface InventoryCategory {
  id: string;
  koperasi_id: string;
  unit_usaha_id?: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface InventorySupplier {
  id: string;
  koperasi_id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
}

export interface InventoryProduct {
  id: string;
  koperasi_id: string;
  unit_usaha_id: string;
  category_id?: string;
  supplier_id?: string;
  barcode?: string;
  sku?: string;
  name: string;
  description?: string;
  product_type: 'regular' | 'consignment';
  price_cost: number;
  price_sell_public: number;
  price_sell_member: number;
  stock_quantity: number;
  min_stock_alert: number;
  unit: string;
  is_active: boolean;
}

export interface POSTransaction {
  id: string;
  koperasi_id: string;
  unit_usaha_id: string;
  transaction_date: string;
  invoice_number: string;
  member_id?: string;
  customer_name?: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  payment_method: string;
  payment_status: string;
  notes?: string;
  voucher_code?: string;
  points_used?: number;
  items?: POSTransactionItem[];
  created_by?: string;
}

export interface POSTransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  quantity: number;
  price_at_sale: number;
  cost_at_sale: number;
  subtotal: number;
  product?: InventoryProduct;
}


export type PaymentBreakdown = {
  method: 'cash' | 'qris' | 'savings_balance';
  amount: number;
  account_id?: string;
};

export type RetailSettings = {
  id: string;
  koperasi_id: string;
  purchase_invoice_prefix: string;
  purchase_return_prefix: string;
  sales_invoice_prefix: string;
  sales_return_prefix: string;
  receipt_header?: string;
  receipt_footer?: string;
  receipt_width?: number;
  created_at: string;
  updated_at: string;
};

export class RetailService {
  private paymentService: PaymentService;
  private savingsService: SavingsService;
  private loyaltyService: LoyaltyService;

  constructor(private supabase: SupabaseClient) {
    this.paymentService = new PaymentService(supabase);
    this.savingsService = new SavingsService(supabase);
    this.loyaltyService = new LoyaltyService(supabase);
  }

  // Products
  async getProducts(
    koperasiId: string,
    searchOrOpts?: string | { search?: string; type?: 'regular' | 'consignment' }
  ) {
    const opts =
      typeof searchOrOpts === 'string'
        ? { search: searchOrOpts }
        : (searchOrOpts || {});

    let query = this.supabase
      .from('inventory_products')
      .select(`
        *,
        category:inventory_categories(name),
        supplier:inventory_suppliers(name)
      `)
      .eq('koperasi_id', koperasiId)
      .eq('is_active', true)
      .order('name');

    if (opts.search) {
      query = query.or(`name.ilike.%${opts.search}%,sku.ilike.%${opts.search}%,barcode.eq.${opts.search}`);
    }
    if (opts.type) {
      query = query.eq('product_type', opts.type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getProductByBarcode(koperasiId: string, barcode: string) {
    const { data, error } = await this.supabase
      .from('inventory_products')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('barcode', barcode)
      .single();

    if (error) return null;
    return data;
  }

  async createProduct(product: Partial<InventoryProduct>) {
    const { data, error } = await this.supabase
      .from('inventory_products')
      .insert(product)
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      throw error;
    }
    return data;
  }

  async updateProduct(id: string, updates: Partial<InventoryProduct>) {
    const { data, error } = await this.supabase
      .from('inventory_products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async createStockOpname(
    opname: {
      koperasi_id: string;
      notes?: string;
      status: 'draft' | 'final';
      created_by: string;
    },
    items: {
      product_id: string;
      system_qty: number;
      actual_qty: number;
      notes?: string;
    }[]
  ) {
    // 1. Create Opname Header
    const { data: opnameData, error: opnameError } = await this.supabase
      .from('inventory_stock_opname')
      .insert(opname)
      .select()
      .single();

    if (opnameError) throw opnameError;

    // 2. Create Opname Items
    const itemsWithId = items.map(item => ({
      ...item,
      opname_id: opnameData.id,
      difference: item.actual_qty - item.system_qty
    }));

    const { error: itemsError } = await this.supabase
      .from('inventory_stock_opname_items')
      .insert(itemsWithId);

    if (itemsError) throw itemsError;

    // 3. Update Stock if final
    if (opname.status === 'final') {
      for (const item of itemsWithId) {
        if (item.difference !== 0) {
          await this.adjustStock(item.product_id, item.difference, 'opname_adjustment', opnameData.id);
        }
      }
    }

    return opnameData;
  }

  async adjustStock(productId: string, quantity: number, type: string, referenceId: string) {
    const { data: product } = await this.supabase
      .from('inventory_products')
      .select('stock_quantity')
      .eq('id', productId)
      .single();

    if (product) {
      const newStock = product.stock_quantity + quantity;
      await this.supabase
        .from('inventory_products')
        .update({ stock_quantity: newStock })
        .eq('id', productId);

      // Log movement (optional but good for audit)
      // This is simplified; ideally use a proper inventory movement log table
    }
  }

  // Categories
  async getCategories(koperasiId: string) {
    const { data, error } = await this.supabase
      .from('inventory_categories')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  }

  async createCategory(category: Partial<InventoryCategory>) {
    const { data, error } = await this.supabase
      .from('inventory_categories')
      .insert(category)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Suppliers
  async getSuppliers(koperasiId: string) {
    const { data, error } = await this.supabase
      .from('inventory_suppliers')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data;
  }

  async getSupplierById(id: string) {
    const { data, error } = await this.supabase
      .from('inventory_suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createSupplier(supplier: Partial<InventorySupplier>) {
    const { data, error } = await this.supabase
      .from('inventory_suppliers')
      .insert(supplier)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateSupplier(id: string, updates: Partial<InventorySupplier>) {
    const { data, error } = await this.supabase
      .from('inventory_suppliers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteSupplier(id: string) {
    // Soft delete
    const { data, error } = await this.supabase
      .from('inventory_suppliers')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Discounts
  async getDiscounts(koperasiId: string) {
    const { data, error } = await this.supabase
      .from('inventory_discounts')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createDiscount(discount: {
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
    const { data, error } = await this.supabase
      .from('inventory_discounts')
      .insert(discount)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateDiscount(id: string, updates: Partial<{
    name: string;
    type: 'percentage' | 'fixed_amount';
    value: number;
    start_date: string;
    end_date: string;
    min_purchase_amount: number;
    is_active: boolean;
  }>) {
    const { data, error } = await this.supabase
      .from('inventory_discounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Retail Settings
  async getRetailSettings(koperasiId: string) {
    const { data, error } = await this.supabase
      .from('retail_settings')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (!data) {
      return {
        purchase_invoice_prefix: 'INV-PB-',
        purchase_return_prefix: 'RET-PB-',
        sales_invoice_prefix: 'INV-PJ-',
        sales_return_prefix: 'RET-PJ-',
        receipt_width: 80
      };
    }

    return data;
  }

  async updateRetailSettings(koperasiId: string, settings: Partial<Omit<RetailSettings, 'id' | 'koperasi_id' | 'created_at' | 'updated_at'>>) {
    const { data: existing } = await this.supabase
      .from('retail_settings')
      .select('id')
      .eq('koperasi_id', koperasiId)
      .single();

    if (existing) {
      const { data, error } = await this.supabase
        .from('retail_settings')
        .update(settings)
        .eq('koperasi_id', koperasiId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await this.supabase
        .from('retail_settings')
        .insert({
          ...settings,
          koperasi_id: koperasiId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  }


  async getStockOpnameById(id: string) {
    const { data, error } = await this.supabase
      .from('inventory_stock_opname')
      .select('*, items:inventory_stock_opname_items(*, product:inventory_products(name))')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // Purchases (Stock In)
  async getPurchases(koperasiId: string, limit = 50) {
    const { data, error } = await this.supabase
      .from('inventory_purchases')
      .select(`
        *,
        supplier:inventory_suppliers(name)
      `)
      .eq('koperasi_id', koperasiId)
      .order('purchase_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async getPurchaseById(id: string) {
    const { data, error } = await this.supabase
      .from('inventory_purchases')
      .select(`
        *,
        supplier:inventory_suppliers(name),
        items:inventory_purchase_items(
          *,
          product:inventory_products(name, sku, unit)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getUnpaidPurchases(koperasiId: string) {
    const { data, error } = await this.supabase
      .from('inventory_purchases')
      .select(`
        *,
        supplier:inventory_suppliers(name)
      `)
      .eq('koperasi_id', koperasiId)
      .eq('payment_status', 'debt')
      .order('purchase_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createPurchaseRecord(
    purchase: {
      koperasi_id: string;
      unit_usaha_id: string;
      supplier_id: string;
      invoice_number: string;
      total_amount: number;
      tax_amount?: number;
      payment_status: 'paid' | 'debt';
      notes?: string;
      created_by: string;
      po_id?: string;
    },
    items: {
      product_id: string;
      quantity: number;
      cost_per_item: number;
      subtotal: number;
    }[]
  ) {
    const { tax_amount, ...purchasePayload } = purchase;

    // 1. Create Purchase Header
    const { data: purchaseData, error: purchaseError } = await this.supabase
      .from('inventory_purchases')
      .insert(purchasePayload)
      .select()
      .single();

    if (purchaseError) {
      throw new Error(`Purchase creation failed: ${purchaseError.message}`);
    }

    // 2. Create Purchase Items
    const itemsWithId = items.map(item => ({
      ...item,
      purchase_id: purchaseData.id
    }));

    const { error: itemsError } = await this.supabase
      .from('inventory_purchase_items')
      .insert(itemsWithId);

    if (itemsError) throw itemsError;

    // 3. Update Product Stock & Average Cost
    for (const item of items) {
      const { data: product } = await this.supabase
        .from('inventory_products')
        .select('stock_quantity, price_cost')
        .eq('id', item.product_id)
        .single();

      if (product) {
        const currentTotalValue = product.stock_quantity * product.price_cost;
        const newStockValue = item.quantity * item.cost_per_item;
        const newTotalStock = product.stock_quantity + item.quantity;

        const newAverageCost = newTotalStock > 0
          ? (currentTotalValue + newStockValue) / newTotalStock
          : item.cost_per_item;

        await this.supabase
          .from('inventory_products')
          .update({
            stock_quantity: newTotalStock,
            price_cost: Math.round(newAverageCost)
          })
          .eq('id', item.product_id);
      }
    }

    return purchaseData;
  }

  // Purchase Orders (PO)
  async getPurchaseOrders(koperasiId: string, limit = 50) {
    const { data, error } = await this.supabase
      .from('inventory_purchase_orders')
      .select(`
        *,
        supplier:inventory_suppliers(name)
      `)
      .eq('koperasi_id', koperasiId)
      .order('order_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  async getPurchaseOrderById(id: string) {
    const { data, error } = await this.supabase
      .from('inventory_purchase_orders')
      .select(`
        *,
        supplier:inventory_suppliers(name),
        items:inventory_purchase_order_items(
          *,
          product:inventory_products(name, sku, unit)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createPurchaseOrder(
    po: {
      koperasi_id: string;
      unit_usaha_id?: string;
      supplier_id: string;
      po_number: string;
      status: 'draft' | 'ordered';
      total_amount: number;
      notes?: string;
      created_by: string;
    },
    items: {
      product_id: string;
      quantity_ordered: number;
      cost_per_item: number;
      subtotal: number;
    }[]
  ) {
    const { data: poData, error: poError } = await this.supabase
      .from('inventory_purchase_orders')
      .insert(po)
      .select()
      .single();

    if (poError) throw poError;

    const itemsWithId = items.map(item => ({
      ...item,
      po_id: poData.id
    }));

    const { error: itemsError } = await this.supabase
      .from('inventory_purchase_order_items')
      .insert(itemsWithId);

    if (itemsError) throw itemsError;

    return poData;
  }

  async updatePurchaseOrderStatus(id: string, status: string, approvedBy?: string) {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (approvedBy && status === 'approved') {
      updates.approved_by = approvedBy;
    }

    const { data, error } = await this.supabase
      .from('inventory_purchase_orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }



  // Purchase Returns
  async getPurchaseReturns(koperasiId: string) {
    const { data, error } = await this.supabase
      .from('inventory_purchase_returns')
      .select(`
        *,
        supplier:inventory_suppliers(name),
        purchase:inventory_purchases(invoice_number)
      `)
      .eq('koperasi_id', koperasiId)
      .order('return_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createPurchaseReturnRecord(
    returnHeader: {
      koperasi_id: string;
      unit_usaha_id?: string;
      purchase_id: string;
      supplier_id: string;
      return_number: string;
      reason?: string;
      status: 'pending' | 'completed';
      total_refund_amount: number;
      created_by: string;
    },
    items: {
      product_id: string;
      quantity: number;
      refund_amount_per_item: number;
      subtotal: number;
    }[]
  ) {
    const { data: returnData, error: returnError } = await this.supabase
      .from('inventory_purchase_returns')
      .insert(returnHeader)
      .select()
      .single();

    if (returnError) {
      throw new Error(`Return creation failed: ${returnError.message}`);
    }

    const itemsWithId = items.map(item => ({
      ...item,
      return_id: returnData.id
    }));

    const { error: itemsError } = await this.supabase
      .from('inventory_purchase_return_items')
      .insert(itemsWithId);

    if (itemsError) throw itemsError;

    if (returnHeader.status === 'completed') {
      for (const item of items) {
        const { error: stockError } = await this.supabase.rpc('decrement_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity
        });

        if (stockError) {
          const { data: product } = await this.supabase
            .from('inventory_products')
            .select('stock_quantity')
            .eq('id', item.product_id)
            .single();

          if (product) {
            await this.supabase
              .from('inventory_products')
              .update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) })
              .eq('id', item.product_id);
          }
        }
      }
    }

    return returnData;
  }

  // Sales Returns
  async getSalesReturns(koperasiId: string) {
    const { data, error } = await this.supabase
      .from('pos_returns')
      .select(`
        *,
        transaction:pos_transactions(invoice_number, customer_name)
      `)
      .eq('koperasi_id', koperasiId)
      .order('return_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  async calculateReturnCOGS(items: { product_id: string; quantity: number }[]) {
    let totalReturnCOGS = 0;
    for (const item of items) {
      const { data: product } = await this.supabase
        .from('inventory_products')
        .select('price_cost')
        .eq('id', item.product_id)
        .single();

      if (product) {
        totalReturnCOGS += (product.price_cost * item.quantity);
      }
    }
    return totalReturnCOGS;
  }

  async calculateSettlementData(transactionId: string) {
    // 1. Fetch Items with Product Details
    const { data: items, error } = await this.supabase
      .from('pos_transaction_items')
      .select('*, product:inventory_products(product_type, price_cost)')
      .eq('transaction_id', transactionId);

    if (error) throw error;
    if (!items) return { totalCOGS: 0, inventoryCreditAmount: 0, consignmentCreditAmount: 0 };

    let totalCOGS = 0;
    let inventoryCreditAmount = 0;
    let consignmentCreditAmount = 0;

    for (const item of items) {
      // Use stored cost_at_sale if available (more accurate for historical data)
      // Fallback to product.price_cost
      const cost = item.cost_at_sale || item.product?.price_cost || 0;
      const lineCOGS = cost * item.quantity;

      totalCOGS += lineCOGS;

      if (item.product?.product_type === 'consignment') {
        consignmentCreditAmount += lineCOGS;
      } else {
        inventoryCreditAmount += lineCOGS;
      }
    }

    return {
      totalCOGS,
      inventoryCreditAmount,
      consignmentCreditAmount
    };
  }

  async createSalesReturnRecord(
    returnHeader: {
      koperasi_id: string;
      unit_usaha_id?: string;
      transaction_id: string;
      return_number: string;
      reason?: string;
      status: 'pending' | 'completed';
      total_refund_amount: number;
      created_by: string;
    },
    items: {
      product_id: string;
      quantity: number;
      refund_amount_per_item: number;
      subtotal: number;
    }[]
  ) {
    // 1. Create Return Header
    const { data: returnData, error: returnError } = await this.supabase
      .from('pos_returns')
      .insert(returnHeader)
      .select()
      .single();

    if (returnError) {
      throw new Error(`Return creation failed: ${returnError.message}`);
    }

    // 2. Create Return Items
    const itemsWithId = items.map(item => ({
      ...item,
      return_id: returnData.id
    }));

    const { error: itemsError } = await this.supabase
      .from('pos_return_items')
      .insert(itemsWithId);

    if (itemsError) throw itemsError;

    // 3. Update Stock (if completed)
    if (returnHeader.status === 'completed') {
      for (const item of items) {
        const { data: product } = await this.supabase
          .from('inventory_products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (product) {
          await this.supabase
            .from('inventory_products')
            .update({ stock_quantity: product.stock_quantity + item.quantity })
            .eq('id', item.product_id);
        }
      }
    }

    return returnData;
  }

  async getReceivables(koperasiId: string) {
    const { data, error } = await this.supabase
      .from('pos_transactions')
      .select(`
        *,
        member:member(name, member_number)
      `)
      .eq('koperasi_id', koperasiId)
      .eq('payment_status', 'debt')
      .order('transaction_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  // POS Transaction
  async getPosTransactions(koperasiId: string, limit = 50, status?: string) {
    let query = this.supabase
      .from('pos_transactions')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .order('transaction_date', { ascending: false })
      .limit(limit);

    if (status) {
      if (status === 'kiosk_pending') {
        query = query.eq('payment_status', 'pending').ilike('notes', '%[KIOSK]%');
      } else {
        query = query.eq('payment_status', status);
      }
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  async getPosTransactionById(id: string) {
    const { data, error } = await this.supabase
      .from('pos_transactions')
      .select(`
        *,
        items:pos_transaction_items(
          *,
          product:inventory_products(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async cancelPosTransaction(id: string) {
    const { data: tx, error } = await this.supabase
      .from('pos_transactions')
      .select(`
        *,
        items:pos_transaction_items(*)
      `)
      .eq('id', id)
      .single();

    if (error || !tx) return;

    if (tx.items) {
      for (const item of tx.items) {
        const { data: product } = await this.supabase
          .from('inventory_products')
          .select('stock_quantity')
          .eq('id', item.product_id)
          .single();

        if (product) {
          await this.supabase
            .from('inventory_products')
            .update({ stock_quantity: product.stock_quantity + item.quantity })
            .eq('id', item.product_id);
        }
      }
    }

    await this.supabase.from('pos_transactions').delete().eq('id', id);
  }

  async prepareTransactionData(
    transaction: Partial<POSTransaction>,
    items: Partial<POSTransactionItem>[],
    payments?: PaymentBreakdown[]
  ) {
    // 0. Pre-flight Checks & Calculations
    const paymentMethod = transaction.payment_method || 'cash';
    const memberId = transaction.member_id;
    const finalAmount = transaction.final_amount || 0;
    const taxAmount = transaction.tax_amount || 0;

    const paymentsToProcess: PaymentBreakdown[] = payments && payments.length > 0 ? payments : [{ method: paymentMethod as PaymentBreakdown['method'], amount: finalAmount }];

    // Validate and Augment Payments (e.g. fetch account_id for savings)
    for (const p of paymentsToProcess) {
      if (p.method === 'savings_balance') {
        if (!memberId) throw new Error('Member ID is required for savings payment');

        // Fetch full account details to get ID for Ledger
        const account = await this.savingsService.getVoluntaryAccount(memberId);
        if (!account) throw new Error('No active voluntary savings account found');

        if (account.balance < p.amount) {
          throw new Error('Saldo simpanan sukarela tidak mencukupi');
        }

        // Assign account_id so LedgerIntentService can link entity
        p.account_id = account.id;
      }
    }

    // Calculate COGS & Consignment for Ledger Intent
    let totalCOGS = 0;
    let inventoryCreditAmount = 0;
    let consignmentCreditAmount = 0;

    const productDetailsMap = new Map<string, any>();

    for (const item of items) {
      if (!item.product_id) continue;

      // Check if we already fetched
      if (!productDetailsMap.has(item.product_id)) {
        const { data: product } = await this.supabase
          .from('inventory_products')
          .select('id, is_consignment, consignment_fee_percent, price_cost')
          .eq('id', item.product_id)
          .single();
        if (product) productDetailsMap.set(item.product_id, product);
      }

      const product = productDetailsMap.get(item.product_id);
      const qty = item.quantity || 0;

      if (product) {
        if (product.is_consignment) {
          // Consignment: Credit goes to Consignment Payable
          let payable = 0;
          if (product.consignment_fee_percent && product.consignment_fee_percent > 0) {
            const salePrice = item.price_at_sale || 0;
            payable = salePrice * ((100 - product.consignment_fee_percent) / 100);
          } else {
            payable = product.price_cost || 0;
          }
          const itemConsignmentCost = payable * qty;

          totalCOGS += itemConsignmentCost;
          consignmentCreditAmount += itemConsignmentCost;
        } else {
          // Regular: Credit goes to Inventory
          const itemCost = (item.cost_at_sale || product.price_cost || 0) * qty;
          totalCOGS += itemCost;
          inventoryCreditAmount += itemCost;
        }
      }
    }

    const invoiceNumber = transaction.invoice_number || `INV-${Date.now()}`;

    return {
      invoiceNumber,
      finalAmount,
      taxAmount,
      totalCOGS,
      inventoryCreditAmount,
      consignmentCreditAmount,
      paymentsToProcess
    };
  }

  async fulfillTransaction(
    journalId: string,
    transaction: Partial<POSTransaction>,
    items: Partial<POSTransactionItem>[],
    paymentsToProcess: PaymentBreakdown[]
  ) {
    // 1. Create Transaction Header
    console.log('Creating POS Transaction Header...');
    const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo';
    const memberId = transaction.member_id;
    const finalAmount = transaction.final_amount || 0;

    const { data: txData, error: txError } = await this.supabase
      .from('pos_transactions')
      .insert({
        ...transaction,
        // invoice_number should be passed in transaction object from prepareTransactionData result
        payment_status: transaction.payment_status || ((paymentsToProcess.some(p => p.method === 'qris')) ? 'pending' : 'paid'),
        is_test_transaction: isDemoMode,
        // We could store journalId here if we added a column for it, but for now we link via logic/time
      })
      .select()
      .single();

    if (txError) {
      console.error('Error creating POS Transaction:', txError);
      throw new Error(`Transaction creation failed: ${txError.message}`);
    }
    if (!txData) {
      throw new Error('POS Transaction created but no data returned');
    }

    // 2. Create Transaction Items
    const itemsWithTxId = items.map(item => ({
      ...item,
      transaction_id: txData.id
    }));

    const { error: itemsError } = await this.supabase
      .from('pos_transaction_items')
      .insert(itemsWithTxId);

    if (itemsError) throw itemsError;

    // 3. Update Stock
    for (const item of items) {
      if (!item.product_id || !item.quantity) continue;

      const { error: stockError } = await this.supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity
      });

      // Fallback
      if (stockError) {
        // Simple fallback without re-fetching everything (optimistic)
        const { data: currentP } = await this.supabase.from('inventory_products').select('stock_quantity').eq('id', item.product_id).single();
        if (currentP) {
          await this.supabase.from('inventory_products')
            .update({ stock_quantity: currentP.stock_quantity - item.quantity })
            .eq('id', item.product_id);
        }
      }
    }

    // 4. Payment Processing (Record Only - Skip Journal)
    // In STAGE 3 (Marketplace Orchestration), RetailService MUST NOT touch balances.
    // We only record the operational payment details if needed for receipts.
    // The actual financial movement is handled by MarketplaceService via Ledger.

    let paymentResult: any = {};

    // Handle Loyalty & Vouchers
    if (transaction.voucher_code) {
      const { data: voucher } = await this.supabase.from('vouchers').select('id, usage_count').eq('code', transaction.voucher_code).single();
      if (voucher) {
        await this.supabase.from('vouchers').update({ usage_count: (voucher.usage_count || 0) + 1 }).eq('id', voucher.id);
        await this.supabase.from('voucher_usages').insert({
          voucher_id: voucher.id,
          member_id: memberId,
          transaction_id: txData.id,
          discount_amount: transaction.discount_amount || 0
        });
      }
    }

    // Points are processed here (Operational Reward). 
    // If transaction is reversed later, MarketplaceService must handle point reversal or we ignore for now as minor.
    if (transaction['points_used'] && transaction['points_used'] > 0 && memberId) {
      await this.loyaltyService.redeemPoints(
        transaction.koperasi_id!,
        memberId,
        transaction['points_used'],
        `Redeem Points for Invoice #${txData.invoice_number}`,
        txData.id
      );
    }

    if (memberId && finalAmount > 0) {
      const pointsToEarn = Math.floor(finalAmount / 10000);
      if (pointsToEarn > 0) {
        await this.loyaltyService.addPoints(
          transaction.koperasi_id!,
          memberId,
          pointsToEarn,
          `Points earned from Invoice #${txData.invoice_number}`,
          txData.id
        );
      }
    }

    // Record Payment Methods for Receipt/History purposes ONLY.
    // NO Balance Deduction here.
    if (transaction.created_by) {
      for (const p of paymentsToProcess) {
        if (p.amount <= 0) continue;

        if (p.method === 'cash') {
          // Just record that cash was used
          await this.paymentService.recordManualPayment(
            transaction.koperasi_id!,
            txData.id,
            'retail_sale',
            p.amount,
            'cash',
            `Payment Cash for POS ${txData.invoice_number}`,
            transaction.created_by,
            true // SKIP JOURNAL
          );
        } else if (p.method === 'savings_balance') {
          // Just record that savings was used. 
          // DO NOT CALL savingsService.deductBalance()
          await this.paymentService.recordManualPayment(
            transaction.koperasi_id!,
            txData.id,
            'retail_sale',
            p.amount,
            'savings_balance',
            `Payment Savings for POS ${txData.invoice_number}`,
            transaction.created_by,
            true // SKIP JOURNAL
          );
        } else if (p.method === 'qris') {
          // For QRIS, we might need the ID if generated externally, but here we assume it's already handled or just recording.
          // In STAGE 3, QRIS integration might need to happen before Lock or during Lock.
          // For now, we just record.
        }
      }
    }

    return { ...txData, ...paymentResult };
  }

  // Stock Opname
  async getStockOpnames(koperasiId: string) {
    const { data, error } = await this.supabase
      .from('inventory_stock_opname')
      .select(`
        *,
        creator:created_by(email)
      `)
      .eq('koperasi_id', koperasiId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async calculateOpnameVariance(
    koperasiId: string,
    items: {
      product_id: string;
      system_qty: number;
      actual_qty: number;
    }[]
  ): Promise<number> {
    let totalVarianceValue = 0;

    for (const item of items) {
      if (item.actual_qty !== item.system_qty) {
        const { data: product } = await this.supabase
          .from('inventory_products')
          .select('price_cost')
          .eq('id', item.product_id)
          .single();

        if (product) {
          const diff = item.actual_qty - item.system_qty;
          totalVarianceValue += (diff * product.price_cost);
        }
      }
    }
    return totalVarianceValue;
  }

  async applyOpnameStockUpdate(
    opnameId: string,
    items: {
      product_id: string;
      system_qty: number;
      actual_qty: number;
    }[]
  ) {
    for (const item of items) {
      if (item.actual_qty !== item.system_qty) {
        await this.supabase
          .from('inventory_products')
          .update({ stock_quantity: item.actual_qty })
          .eq('id', item.product_id);
      }
    }
  }

  async createStockOpnameRecord(
    opname: {
      koperasi_id: string;
      unit_usaha_id?: string;
      notes?: string;
      status: 'draft' | 'final';
      created_by: string;
    },
    items: {
      product_id: string;
      system_qty: number;
      actual_qty: number;
      notes?: string;
    }[]
  ) {
    // 1. Create Document Header & Items (Operational State - Safe to do first as it's just a document)
    const { data: opnameData, error: opnameError } = await this.supabase
      .from('inventory_stock_opname')
      .insert(opname)
      .select()
      .single();

    if (opnameError) throw opnameError;

    const itemsWithId = items.map(item => ({
      ...item,
      opname_id: opnameData.id
    }));

    const { error: itemsError } = await this.supabase
      .from('inventory_stock_opname_items')
      .insert(itemsWithId);

    if (itemsError) throw itemsError;

    return opnameData;
  }


  async getDailyReport(koperasiId: string, date: Date = new Date()) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: sales, error: salesError } = await this.supabase
      .from('pos_transactions')
      .select('final_amount, payment_method')
      .eq('koperasi_id', koperasiId)
      .gte('transaction_date', startOfDay.toISOString())
      .lte('transaction_date', endOfDay.toISOString());

    if (salesError) throw salesError;

    const { data: purchases, error: purchasesError } = await this.supabase
      .from('inventory_purchases')
      .select('total_amount, payment_status')
      .eq('koperasi_id', koperasiId)
      .gte('purchase_date', startOfDay.toISOString())
      .lte('purchase_date', endOfDay.toISOString());

    if (purchasesError) throw purchasesError;

    const totalSales = sales?.reduce((acc, curr) => acc + (curr.final_amount || 0), 0) || 0;
    const totalPurchases = purchases?.reduce((acc, curr) => acc + (curr.total_amount || 0), 0) || 0;
    const transactionCount = sales?.length || 0;

    return {
      date: startOfDay,
      totalSales,
      totalPurchases,
      transactionCount,
      sales,
      purchases
    };
  }

  async getSalesSummary(koperasiId: string, startDate: Date, endDate: Date) {
    const { data: sales, error } = await this.supabase
      .from('pos_transactions')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .gte('transaction_date', startDate.toISOString())
      .lte('transaction_date', endDate.toISOString());

    if (error) throw error;

    const byPaymentMethod = sales?.reduce((acc: any, curr) => {
      const method = curr.payment_method || 'unknown';
      if (!acc[method]) acc[method] = 0;
      acc[method] += curr.final_amount;
      return acc;
    }, {});

    const byDate = sales?.reduce((acc: any, curr) => {
      const date = new Date(curr.transaction_date).toISOString().split('T')[0];
      if (!acc[date]) acc[date] = 0;
      acc[date] += curr.final_amount;
      return acc;
    }, {});

    return {
      total_sales: sales?.reduce((acc, curr) => acc + curr.final_amount, 0) || 0,
      transaction_count: sales?.length || 0,
      average_transaction: sales && sales.length > 0 ? (sales.reduce((acc, curr) => acc + curr.final_amount, 0) / sales.length) : 0,
      by_payment_method: byPaymentMethod,
      by_date: byDate,
      raw_data: sales
    };
  }

  async getSoldItemsReport(koperasiId: string, startDate: Date, endDate: Date) {
    const { data: items, error } = await this.supabase
      .from('pos_transaction_items')
      .select(`
        *,
        product:inventory_products(name, category_id, sku, barcode),
        transaction:pos_transactions!inner(transaction_date, koperasi_id, payment_status)
      `)
      .eq('transaction.koperasi_id', koperasiId)
      .gte('transaction.transaction_date', startDate.toISOString())
      .lte('transaction.transaction_date', endDate.toISOString())
      .neq('transaction.payment_status', 'cancelled');

    if (error) throw error;

    const grouped = items?.reduce((acc: any, curr: any) => {
      const productId = curr.product_id;
      if (!acc[productId]) {
        acc[productId] = {
          product_id: productId,
          product_name: curr.product?.name || 'Unknown',
          sku: curr.product?.sku,
          barcode: curr.product?.barcode,
          quantity_sold: 0,
          total_revenue: 0,
          total_cogs: 0
        };
      }
      acc[productId].quantity_sold += curr.quantity;
      acc[productId].total_revenue += curr.subtotal;
      acc[productId].total_cogs += (curr.cost_at_sale || 0) * curr.quantity;
      return acc;
    }, {});

    return grouped;
  }

  async getConsignmentReport(koperasiId: string, startDate: Date, endDate: Date) {
    const { data: items, error } = await this.supabase
      .from('pos_transaction_items')
      .select(`
        *,
        product:inventory_products!inner(name, sku, is_consignment, consignment_fee_percent, consignment_supplier_id),
        transaction:pos_transactions!inner(transaction_date, koperasi_id, payment_status, invoice_number)
      `)
      .eq('transaction.koperasi_id', koperasiId)
      .eq('product.is_consignment', true)
      .gte('transaction.transaction_date', startDate.toISOString())
      .lte('transaction.transaction_date', endDate.toISOString())
      .neq('transaction.payment_status', 'cancelled');

    if (error) throw error;

    const bySupplier = items?.reduce((acc: any, curr: any) => {
      const supplierId = curr.product.consignment_supplier_id || 'unknown';
      if (!acc[supplierId]) {
        acc[supplierId] = {
          supplier_id: supplierId,
          total_sales: 0,
          total_payable: 0,
          total_commission: 0,
          items: []
        };
      }

      const saleAmount = curr.subtotal;
      let payable = 0;
      if (curr.product.consignment_fee_percent > 0) {
        payable = saleAmount * ((100 - curr.product.consignment_fee_percent) / 100);
      } else {
        payable = (curr.cost_at_sale || 0) * curr.quantity;
      }

      const commission = saleAmount - payable;

      acc[supplierId].total_sales += saleAmount;
      acc[supplierId].total_payable += payable;
      acc[supplierId].total_commission += commission;
      acc[supplierId].items.push(curr);

      return acc;
    }, {});

    return bySupplier;
  }

  async getSalesConsolidationReport(koperasiId: string, startDate: Date, endDate: Date) {
    // 1. Get all transactions with items and products
    const { data: transactions, error } = await this.supabase
      .from('pos_transactions')
      .select(`
        *,
        items:pos_transaction_items(
            *,
            product:inventory_products(
              category:inventory_categories(name)
            )
        )
      `)
      .eq('koperasi_id', koperasiId)
      .gte('transaction_date', startDate.toISOString())
      .lte('transaction_date', endDate.toISOString())
      .neq('payment_status', 'cancelled');

    if (error) throw error;

    // 2. Aggregate Data
    let totalSales = 0;
    let totalTax = 0;
    let totalCOGS = 0;
    let totalDiscounts = 0;
    const byCategory: Record<string, number> = {};
    const byPaymentMethod: Record<string, number> = {};

    transactions?.forEach(tx => {
      totalSales += tx.final_amount;
      totalTax += tx.tax_amount || 0;
      totalDiscounts += tx.discount_amount || 0;

      // Payment Method
      const method = tx.payment_method || 'cash';
      byPaymentMethod[method] = (byPaymentMethod[method] || 0) + tx.final_amount;

      // COGS and Category from items
      if (tx.items) {
        tx.items.forEach((item: any) => {
          // COGS
          const cogs = (item.cost_at_sale || 0) * item.quantity;
          totalCOGS += cogs;

          // Category
          // Note: Supabase response structure for nested relation might vary (array or object)
          // Assuming 1:1 relation from product to category
          const categoryName = item.product?.category?.name || 'Uncategorized';
          byCategory[categoryName] = (byCategory[categoryName] || 0) + item.subtotal;
        });
      }
    });

    const netSales = totalSales - totalTax;
    const grossProfit = netSales - totalCOGS;

    return {
      period: { start: startDate, end: endDate },
      summary: {
        total_sales_gross: totalSales,
        total_tax: totalTax,
        total_discounts: totalDiscounts,
        net_sales: netSales,
        total_cogs: totalCOGS,
        gross_profit: grossProfit,
        gross_margin_percent: netSales > 0 ? (grossProfit / netSales) * 100 : 0
      },
      by_category: byCategory,
      by_payment_method: byPaymentMethod,
      transaction_count: transactions?.length || 0
    };
  }
}
