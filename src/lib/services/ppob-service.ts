import { SupabaseClient } from '@supabase/supabase-js';
import { AccountingService, CreateJournalDTO } from './accounting-service';
import { AccountCode } from '@/lib/types/ledger';

export interface PpobProduct {
  id: string;
  code: string;
  name: string;
  category: string;
  provider: string;
  description: string;
  price_buy: number;
  price_sell: number;
  admin_fee: number;
  is_active: boolean;
}

export interface PpobTransactionData {
  member_id: string;
  koperasi_id: string;
  account_id: string; // Savings account to debit
  product_code: string;
  customer_number: string; // Phone number or ID Pelanggan
}

export class PpobService {

  constructor(private supabase: SupabaseClient) { }

  /**
   * Get Active PPOB Products
   */
  async getProducts(koperasiId: string, category?: string) {
    try {
      // Try strict multi-tenant query first
      let query = this.supabase
        .from('ppob_products')
        .select('*')
        .eq('is_active', true)
        .or(`koperasi_id.eq.${koperasiId},koperasi_id.is.null`);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query.order('price_sell', { ascending: true });
      if (error) throw error;
      return data as PpobProduct[];
    } catch (error: any) {
      // Fallback for schema mismatch (missing koperasi_id)
      if (error.message?.includes('koperasi_id')) {
        console.warn('⚠️ PPOBService: Schema mismatch (missing koperasi_id), falling back to global query.');
        let query = this.supabase
          .from('ppob_products')
          .select('*')
          .eq('is_active', true);

        if (category) {
          query = query.eq('category', category);
        }
        
        // Note: 'price_sell' might also be 'price' in old schema
        const { data, error: fbError } = await query;
        if (fbError) throw fbError;
        
        // Map old schema to new interface if needed
        return data.map((p: any) => ({
            ...p,
            price_sell: p.price_sell || p.price,
            price_buy: p.price_buy || (p.price_sell || p.price) * 0.98,
            code: p.code || p.id
        })) as PpobProduct[];
      }
      throw error;
    }
  }

  /**
   * Validate PPOB Transaction (Stage 3 Helper)
   * Returns product details and cost for Marketplace Lock
   */
  async validateForMarketplace(data: PpobTransactionData) {
    // 1. Get Product Details
    try {
      const { data: products, error: prodError } = await this.supabase
        .from('ppob_products')
        .select('*')
        .or(`code.eq.${data.product_code},id.eq.${data.product_code}`)
        .eq('is_active', true)
        .or(`koperasi_id.eq.${data.koperasi_id},koperasi_id.is.null`)
        .order('koperasi_id', { ascending: false });

      if (prodError) throw prodError;
      if (!products || products.length === 0) throw new Error('Product not found');
      
      return this._checkBalance(products[0], data.account_id);

    } catch (error: any) {
        // Fallback for schema mismatch
        if (error.message?.includes('koperasi_id') || error.message?.includes('code')) {
             console.warn('⚠️ PPOBService: Schema mismatch, trying fallback query.');
             
             // Try fetching by ID only if code fails
             let query = this.supabase
                .from('ppob_products')
                .select('*')
                .eq('is_active', true);
             
             // If we suspect 'code' column is missing, we can't use .or(code.eq...)
             // But we don't know for sure.
             // Let's try to find by ID first (assuming product_code passed is actually ID or Code)
             // Ideally we should try: .eq('id', data.product_code)
             
             const { data: byId, error: idError } = await this.supabase
                .from('ppob_products')
                .select('*')
                .eq('id', data.product_code)
                .eq('is_active', true);

             if (byId && byId.length > 0) {
                 const p = byId[0];
                 const mapped = {
                     ...p,
                     price_sell: p.price_sell || p.price,
                     price_buy: p.price_buy || (p.price_sell || p.price) * 0.98,
                     code: p.code || p.id
                 };
                 return this._checkBalance(mapped, data.account_id);
             }

             // If not found by ID, maybe it was a Code?
             // But if 'code' column is missing, we can't search by it.
             // We can only hope it was an ID.
             
             throw new Error('Product not found (fallback)');
        }
        throw error;
    }
  }

  async _checkBalance(product: any, accountId: string) {
    const { data: account, error: accError } = await this.supabase
      .from('savings_accounts')
      .select('balance, account_number')
      .eq('id', accountId)
      .single();

    if (accError || !account) throw new Error('Savings account not found');

    const totalCost = (product.price_sell || product.price) + (product.admin_fee || 0);

    if (account.balance < totalCost) {
      throw new Error('Insufficient balance');
    }

    return { product, totalCost };
  }

  /**
   * Fulfill PPOB Transaction (Stage 3 Helper)
   * - Records operational transaction
   * - Calls Provider
   * - DOES NOT touch Ledger
   */
  async fulfillMarketplace(
    data: PpobTransactionData, 
    product: PpobProduct, 
    lockJournalId: string
  ) {
    // 1. Create PPOB Transaction Record (Pending)
    const { data: trx, error: trxError } = await this.supabase
      .from('ppob_transactions')
      .insert({
        koperasi_id: data.koperasi_id,
        member_id: data.member_id,
        account_id: data.account_id,
        category: product.category,
        provider: product.provider,
        product_id: product.id,
        product_name: product.name,
        customer_number: data.customer_number,
        price: product.price_sell,
        admin_fee: product.admin_fee || 0,
        total_amount: product.price_sell + (product.admin_fee || 0),
        status: 'pending',
        journal_id: lockJournalId, // Link to Lock Journal
        metadata: {
          base_price: product.price_buy
        },
        created_by: data.member_id
      })
      .select()
      .single();

    if (trxError) throw new Error(`Failed to init transaction: ${trxError.message}`);

    try {
      // 2. Call Provider API (Mock)
      let providerSuccess = true;
      if (data.customer_number === 'FAIL_ME') {
        providerSuccess = false;
      }

      if (!providerSuccess) {
        throw new Error('Provider transaction failed');
      }

      // 3. Update Transaction Status
      await this.supabase
        .from('ppob_transactions')
        .update({ status: 'success' })
        .eq('id', trx.id);

      return { success: true, transaction: trx };

    } catch (err: any) {
      if (trx) {
        await this.supabase
          .from('ppob_transactions')
          .update({ status: 'failed', metadata: { error: err.message } })
          .eq('id', trx.id);
      }
      throw err;
    }
  }
}
