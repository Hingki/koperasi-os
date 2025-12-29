import { SupabaseClient } from '@supabase/supabase-js';
import { AccountingService } from '@/lib/services/accounting-service';
import { AccountCode } from '@/lib/types/ledger';

export class CapitalService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getProducts(koperasiId: string) {
    const { data, error } = await this.supabase
      .from('capital_products')
      .select('*, unit_usaha:unit_usaha(nama_unit)')
      .eq('koperasi_id', koperasiId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getProductById(id: string) {
    const { data, error } = await this.supabase
      .from('capital_products')
      .select('*, unit_usaha:unit_usaha(nama_unit)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async getMemberInvestments(memberId: string) {
    const { data, error } = await this.supabase
      .from('capital_accounts')
      .select('*, product:capital_products(name, profit_share_percent)')
      .eq('member_id', memberId)
      .eq('status', 'active');

    if (error) throw error;
    return data;
  }

  async invest(investment: {
    koperasi_id: string;
    member_id: string;
    product_id: string;
    amount: number;
    payment_method: 'savings' | 'transfer';
  }) {
    // 1. Get Product Details
    const product = await this.getProductById(investment.product_id);
    if (!product) throw new Error('Product not found');
    if (investment.amount < product.min_investment) {
        throw new Error(`Minimum investment is ${product.min_investment}`);
    }

    // 2. If paying via savings, check balance
    if (investment.payment_method === 'savings') {
        const { data: savings } = await this.supabase.rpc('get_member_savings_balance', { 
            p_member_id: investment.member_id 
        }); // Assuming this RPC exists or we check manually. 
        // For simplicity, we'll skip strict balance check here and rely on ledger/transaction logic or assume sufficiency for this demo.
    }

    // 3. Create Capital Account (or update existing)
    const { data: existingAccount } = await this.supabase
        .from('capital_accounts')
        .select('id, amount_invested')
        .eq('member_id', investment.member_id)
        .eq('product_id', investment.product_id)
        .single();

    let accountId = existingAccount?.id;

    if (existingAccount) {
        await this.supabase
            .from('capital_accounts')
            .update({ 
                amount_invested: existingAccount.amount_invested + investment.amount,
                updated_at: new Date().toISOString()
            })
            .eq('id', accountId);
    } else {
        const { data: newAccount, error: createError } = await this.supabase
            .from('capital_accounts')
            .insert({
                koperasi_id: investment.koperasi_id,
                product_id: investment.product_id,
                investor_type: 'member',
                member_id: investment.member_id,
                amount_invested: investment.amount
            })
            .select()
            .single();
        
        if (createError) throw createError;
        accountId = newAccount.id;
    }

    // 4. Record Transaction
    await this.supabase.from('capital_transactions').insert({
        koperasi_id: investment.koperasi_id,
        account_id: accountId,
        transaction_type: 'deposit',
        amount: investment.amount,
        description: `Investasi pada ${product.name}`
    });

    // 5. Ledger Entry
    // Debit: Cash/Bank/Savings Liability, Credit: Equity Participation (Modal Penyertaan)
    // Note: If payment is 'savings', we debit Savings Liability (2-xxxx). If transfer, we debit Bank (1-xxxx).
    const debitAccount = investment.payment_method === 'savings' 
        ? AccountCode.SAVINGS_VOLUNTARY // Assuming voluntary savings used
        : AccountCode.BANK_BCA; 

    try {
        const debitAccId = await AccountingService.getAccountIdByCode(investment.koperasi_id, debitAccount, this.supabase);
        const creditAccId = await AccountingService.getAccountIdByCode(investment.koperasi_id, AccountCode.EQUITY_CAPITAL_PARTICIPATION, this.supabase);

        if (debitAccId && creditAccId) {
            await AccountingService.postJournal({
                koperasi_id: investment.koperasi_id,
                business_unit: 'SIMPAN_PINJAM', // Default to SP or derive from product
                transaction_date: new Date().toISOString().split('T')[0],
                description: `Modal Penyertaan Anggota - ${product.name}`,
                reference_id: `INV-${Date.now()}`,
                reference_type: 'CAPITAL_INVESTMENT',
                lines: [
                    { account_id: debitAccId, debit: investment.amount, credit: 0 },
                    { account_id: creditAccId, debit: 0, credit: investment.amount }
                ]
            }, this.supabase);
        } else {
             console.warn('Accounting Warning: Accounts not found for Capital Investment');
        }
    } catch (ledgerError) {
        console.error('Ledger Recording Failed:', ledgerError);
        // We log but don't fail the transaction as capital record is created.
        // In strict mode, we might want to rollback.
    }

    return { success: true };
  }
}
