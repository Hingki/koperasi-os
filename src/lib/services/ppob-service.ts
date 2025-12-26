import { SupabaseClient } from '@supabase/supabase-js';
import { LedgerService } from './ledger-service';

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
  private ledgerService: LedgerService;

  constructor(private supabase: SupabaseClient) {
    this.ledgerService = new LedgerService(supabase);
  }

  /**
   * Get Active PPOB Products
   */
  async getProducts(koperasiId: string, category?: string) {
    // We allow global products (koperasi_id is null) or specific to koperasi
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
  }

  /**
   * Create and Process PPOB Transaction
   */
  async purchaseProduct(data: PpobTransactionData) {
    // 1. Get Product Details
    // Prioritize Koperasi specific product over global
    const { data: products, error: prodError } = await this.supabase
      .from('ppob_products')
      .select('*')
      .or(`code.eq.${data.product_code},id.eq.${data.product_code}`) // Support ID or Code lookup
      .eq('is_active', true)
      .or(`koperasi_id.eq.${data.koperasi_id},koperasi_id.is.null`)
      .order('koperasi_id', { ascending: false }); // Koperasi specific first (if not null)

    if (prodError || !products || products.length === 0) throw new Error('Product not found');
    
    // Take the first one (most specific)
    const product = products[0];

    // 2. Check Member Balance (Simpanan Sukarela or specified account)
    const { data: account, error: accError } = await this.supabase
      .from('savings_accounts')
      .select('balance, account_number, product:savings_products(name)')
      .eq('id', data.account_id)
      .single();

    if (accError || !account) throw new Error('Savings account not found');

    const totalCost = product.price_sell + (product.admin_fee || 0);

    if (account.balance < totalCost) {
      throw new Error('Insufficient balance');
    }

    // 3. Start Transaction
    
    // A. Create PPOB Transaction Record (Pending)
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
        total_amount: totalCost,
        status: 'pending',
        metadata: {
          base_price: product.price_buy
        },
        created_by: data.member_id // Member initiated
      })
      .select()
      .single();

    if (trxError) throw new Error(`Failed to init transaction: ${trxError.message}`);

    try {
      // B. Debit Savings Account (Atomic RPC)
      const { error: rpcError } = await this.supabase.rpc('decrement_savings_balance', {
        p_account_id: data.account_id,
        p_amount: totalCost
      });

      if (rpcError) throw new Error(`Balance update failed: ${rpcError.message}`);

      // C. Call Provider API (Mock for now)
      // In real world, call Fonnte/Digiflazz here.
      // If fail, we must refund (increment_savings_balance) and set status failed.
      const providerSuccess = true; 

      if (!providerSuccess) {
         // Refund
         await this.supabase.rpc('increment_savings_balance', {
            p_account_id: data.account_id,
            p_amount: totalCost
         });
         await this.supabase.from('ppob_transactions').update({ status: 'failed' }).eq('id', trx.id);
         throw new Error('Provider transaction failed');
      }

      // D. Update Transaction Status
      await this.supabase
        .from('ppob_transactions')
        .update({ status: 'success' })
        .eq('id', trx.id);

      // E. Ledger Entries (Double Entry)
      
      // 1. Revenue Recognition: Debit Savings (Liability Decrease) -> Credit Revenue PPOB
      await this.ledgerService.recordTransaction({
        koperasi_id: data.koperasi_id,
        tx_type: 'ppob_sales',
        tx_reference: trx.id,
        account_debit: '2-1001', // Simpanan Sukarela (Liability) - Debit to decrease
        account_credit: '4-4001', // Pendapatan PPOB (Revenue) - Credit to increase
        amount: totalCost,
        description: `Pembelian PPOB ${product.name} - ${data.customer_number}`,
        created_by: data.member_id,
        source_table: 'ppob_transactions',
        source_id: trx.id
      });

      // 2. Cost Recognition: Debit Expense PPOB -> Credit Cash/Bank
      // Only if we have a buy price (cost)
      if (product.price_buy > 0) {
        await this.ledgerService.recordTransaction({
            koperasi_id: data.koperasi_id,
            tx_type: 'ppob_cost',
            tx_reference: `${trx.id}-cost`,
            account_debit: '5-1102', // Beban Pokok PPOB (Expense) - Debit to increase
            account_credit: '1-1001', // Kas (Asset) - Credit to decrease
            amount: product.price_buy,
            description: `HPP PPOB ${product.name}`,
            created_by: data.member_id,
            source_table: 'ppob_transactions',
            source_id: trx.id
        });
      }

      return { success: true, transaction: trx };

    } catch (err: any) {
      // If failed after PPOB record creation but before success, update status
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
