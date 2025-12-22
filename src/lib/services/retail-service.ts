import { SupabaseClient } from '@supabase/supabase-js';
import { LedgerService } from './ledger-service';
import { AccountCode } from '@/lib/types/ledger';

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

import { PaymentService } from './payment-service';
import { SavingsService } from './savings-service';

export type PaymentBreakdown = {
  method: 'cash' | 'qris' | 'savings_balance';
  amount: number;
};

export class RetailService {
  private ledgerService: LedgerService;
  private paymentService: PaymentService;
  private savingsService: SavingsService;

  constructor(private supabase: SupabaseClient) {
    this.ledgerService = new LedgerService(supabase);
    this.paymentService = new PaymentService(supabase);
    this.savingsService = new SavingsService(supabase);
  }

  // Products
  async getProducts(koperasiId: string, search?: string) {
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

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.eq.${search}`);
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
    
    if (error) throw error;
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

  async createSupplier(supplier: Partial<InventorySupplier>) {
    const { data, error } = await this.supabase
      .from('inventory_suppliers')
      .insert(supplier)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Purchases (Stock In)
  async createPurchase(
    purchase: {
      koperasi_id: string;
      unit_usaha_id: string;
      supplier_id: string;
      invoice_number: string;
      total_amount: number;
      payment_status: 'paid' | 'debt';
      notes?: string;
      created_by: string;
    },
    items: {
      product_id: string;
      quantity: number;
      cost_per_item: number;
      subtotal: number;
    }[]
  ) {
    // 1. Create Purchase Header
    const { data: purchaseData, error: purchaseError } = await this.supabase
      .from('inventory_purchases')
      .insert(purchase)
      .select()
      .single();

    if (purchaseError) throw purchaseError;

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
      // Get current product state
      const { data: product } = await this.supabase
        .from('inventory_products')
        .select('stock_quantity, price_cost')
        .eq('id', item.product_id)
        .single();

      if (product) {
        // Calculate new weighted average cost
        const currentTotalValue = product.stock_quantity * product.price_cost;
        const newStockValue = item.quantity * item.cost_per_item;
        const newTotalStock = product.stock_quantity + item.quantity;
        
        // Avoid division by zero
        const newAverageCost = newTotalStock > 0 
          ? (currentTotalValue + newStockValue) / newTotalStock 
          : item.cost_per_item;

        await this.supabase
          .from('inventory_products')
          .update({
            stock_quantity: newTotalStock,
            price_cost: Math.round(newAverageCost) // Round to nearest integer for IDR
          })
          .eq('id', item.product_id);
      }
    }

    // 4. Record to Ledger (Accounting)
    await this.ledgerService.recordTransaction({
      koperasi_id: purchase.koperasi_id,
      tx_type: 'retail_purchase',
      tx_reference: purchaseData.invoice_number,
      account_debit: AccountCode.INVENTORY_MERCHANDISE,
      account_credit: purchase.payment_status === 'paid' ? AccountCode.CASH_ON_HAND : AccountCode.ACCOUNTS_PAYABLE,
      amount: purchase.total_amount,
      description: `Pembelian Stok ${purchaseData.invoice_number}`,
      source_table: 'inventory_purchases',
      source_id: purchaseData.id,
      created_by: purchase.created_by
    });

    return purchaseData;
  }

  // POS Transaction
  async processTransaction(transaction: Partial<POSTransaction>, items: Partial<POSTransactionItem>[], payments?: PaymentBreakdown[]) {
    // 0. Pre-flight Checks
    const paymentMethod = transaction.payment_method || 'cash';
    const memberId = transaction.member_id;
    const finalAmount = transaction.final_amount || 0;

    if (paymentMethod === 'savings_balance' && (!payments || payments.length === 0)) {
        if (!memberId) throw new Error('Member ID is required for savings payment');
        // Check Balance
        const balance = await this.savingsService.getBalance(memberId, 'sukarela');
        if (balance < finalAmount) {
            throw new Error('Saldo simpanan sukarela tidak mencukupi');
        }
    }

    // 1. Create Transaction Header
    const { data: txData, error: txError } = await this.supabase
      .from('pos_transactions')
      .insert({
        ...transaction,
        invoice_number: `INV-${Date.now()}`,
        payment_status: (payments && payments.some(p => p.method === 'qris')) || paymentMethod === 'qris' ? 'pending' : 'paid'
      })
      .select()
      .single();
    
    if (txError) throw txError;

    // 2. Create Transaction Items
    const itemsWithTxId = items.map(item => ({
      ...item,
      transaction_id: txData.id
    }));

    const { error: itemsError } = await this.supabase
      .from('pos_transaction_items')
      .insert(itemsWithTxId);
    
    if (itemsError) throw itemsError;

    // 3. Update Stock & Calculate COGS
    let totalCOGS = 0;

    for (const item of items) {
      if (!item.product_id || !item.quantity) continue;
      
      // Calculate COGS for this item
      if (item.cost_at_sale) {
        totalCOGS += (item.quantity * item.cost_at_sale);
      }

      // Decrement stock
      const { error: stockError } = await this.supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity
      });
      
      // Fallback if RPC doesn't exist (though it's safer to use RPC for concurrency)
      if (stockError) {
         // simplistic fallback
         const { data: product } = await this.supabase
           .from('inventory_products')
           .select('stock_quantity')
           .eq('id', item.product_id)
           .single();
         
         if (product) {
           await this.supabase
             .from('inventory_products')
             .update({ stock_quantity: product.stock_quantity - item.quantity })
             .eq('id', item.product_id);
         }
      }
    }

    // 4. Payment Processing & Ledger
    let paymentResult: any = {};
    const paymentsToProcess: PaymentBreakdown[] = payments && payments.length > 0 ? payments : [{ method: paymentMethod as PaymentBreakdown['method'], amount: finalAmount }];
    
    if (transaction.created_by) {
      const qrisResults: { qr_code_url: string; payment_transaction_id: string; amount: number }[] = [];
      for (const p of paymentsToProcess) {
        if (p.amount <= 0) continue;
        if (p.method === 'cash') {
          const paymentTx = await this.paymentService.recordManualPayment(
            transaction.koperasi_id!,
            txData.id,
            'retail_sale',
            p.amount,
            'cash',
            `Payment Cash for POS ${txData.invoice_number}`,
            transaction.created_by
          );
          paymentResult.payment_transactions = [...(paymentResult.payment_transactions || []), paymentTx.id];
        } else if (p.method === 'savings_balance') {
          if (!memberId) throw new Error('Member ID is required for savings payment');
          const balance = await this.savingsService.getBalance(memberId, 'sukarela');
          if (balance < p.amount) throw new Error('Saldo simpanan sukarela tidak mencukupi');
          
          await this.savingsService.deductBalance(
            memberId,
            p.amount,
            `Payment for POS ${txData.invoice_number}`,
            transaction.created_by
          );
          const paymentTx = await this.paymentService.recordManualPayment(
            transaction.koperasi_id!,
            txData.id,
            'retail_sale',
            p.amount,
            'savings_balance',
            `Payment Savings for POS ${txData.invoice_number}`,
            transaction.created_by
          );
          paymentResult.payment_transactions = [...(paymentResult.payment_transactions || []), paymentTx.id];
        } else if (p.method === 'qris') {
          const qrisTx = await this.paymentService.createQRISPayment(
            transaction.koperasi_id!,
            txData.id,
            'retail_sale',
            p.amount,
            `Payment QRIS for POS ${txData.invoice_number}`,
            transaction.created_by
          );
          qrisResults.push({ qr_code_url: qrisTx.qr_code_url || '', payment_transaction_id: qrisTx.id, amount: p.amount });
          paymentResult.payment_transactions = [...(paymentResult.payment_transactions || []), qrisTx.id];
        }
      }
      if (qrisResults.length === 1) {
        paymentResult.qr_code_url = qrisResults[0].qr_code_url;
        paymentResult.payment_transaction_id = qrisResults[0].payment_transaction_id;
        paymentResult.qris_amount = qrisResults[0].amount;
      } else if (qrisResults.length > 1) {
        paymentResult.qris_multi = qrisResults;
      }
    }

    // 5. Record COGS (Accounting)
    if (totalCOGS > 0) {
        await this.ledgerService.recordTransaction({
            koperasi_id: transaction.koperasi_id!,
            tx_type: 'retail_sale',
            tx_reference: txData.invoice_number,
            account_debit: AccountCode.COGS,
            account_credit: AccountCode.INVENTORY_MERCHANDISE,
            amount: totalCOGS,
            description: `HPP Penjualan ${txData.invoice_number}`,
            source_table: 'pos_transactions',
            source_id: txData.id,
            created_by: transaction.created_by || '00000000-0000-0000-0000-000000000000'
        });
    }

    return { ...txData, ...paymentResult };
  }
}
