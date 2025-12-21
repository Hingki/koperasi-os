import { SupabaseClient } from '@supabase/supabase-js';
import { LedgerService } from '@/lib/services/ledger-service';
import { AccountCode } from '@/lib/types/ledger';

export class SavingsService {
  private ledgerService: LedgerService;

  constructor(private supabase: SupabaseClient) {
    this.ledgerService = new LedgerService(supabase);
  }

  async getBalance(memberId: string, type: 'sukarela' = 'sukarela'): Promise<number> {
    const { data, error } = await this.supabase
      .from('savings_accounts')
      .select('balance, product:savings_products!inner(type)')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .eq('product.type', type)
      .single();

    if (error) return 0; // Return 0 if no account found
    return data?.balance || 0;
  }

  async deductBalance(
    memberId: string,
    amount: number,
    description: string,
    userId?: string
  ) {
    // 1. Get Account (Voluntary)
    const { data: account, error: accountError } = await this.supabase
      .from('savings_accounts')
      .select('id, koperasi_id, balance, product:savings_products!inner(type)')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .eq('product.type', 'sukarela')
      .single();

    if (accountError || !account) throw new Error('No active voluntary savings account found');
    if (account.balance < amount) throw new Error('Insufficient savings balance');

    const newBalance = account.balance - amount;

    // 2. Update Balance
    const { error: updateError } = await this.supabase
      .from('savings_accounts')
      .update({
        balance: newBalance,
        last_transaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', account.id);

    if (updateError) throw new Error('Failed to update savings balance');

    // 3. Record Savings Transaction (Read Model)
    await this.supabase.from('savings_transactions').insert({
      koperasi_id: account.koperasi_id,
      account_id: account.id,
      member_id: memberId,
      type: 'withdrawal',
      amount: -amount,
      balance_after: newBalance,
      description: description,
      created_by: userId
    });
  }

  async processTransaction(
    accountId: string,
    amount: number,
    type: 'deposit' | 'withdrawal',
    userId: string,
    description?: string
  ) {
    // 1. Validate Amount
    if (amount <= 0) throw new Error('Amount must be positive');

    // 2. Fetch Account & Product
    const { data: account, error: accountError } = await this.supabase
      .from('savings_accounts')
      .select(`
        *,
        product:savings_products(*)
      `)
      .eq('id', accountId)
      .single();

    if (accountError || !account) throw new Error('Savings account not found');
    if (account.status !== 'active') throw new Error('Account is not active');

    // 3. Logic based on Type
    let newBalance = Number(account.balance);
    let ledgerTxType: 'savings_deposit' | 'savings_withdrawal';
    let debitAccount: AccountCode;
    let creditAccount: AccountCode;

    if (type === 'deposit') {
        newBalance += amount;
        ledgerTxType = 'savings_deposit';
        // Debit Cash (Asset +), Credit Savings (Liability +)
        debitAccount = AccountCode.CASH_ON_HAND; 
        creditAccount = this.mapProductToLiabilityAccount(account.product.type);
    } else {
        // Withdrawal
        // Check if allowed
        if (!account.product.is_withdrawal_allowed) {
            // For now simple check. Real logic might check 'is_exit' flag etc.
            throw new Error(`Withdrawals are not allowed for ${account.product.name}`);
        }
        
        // Check Balance
        if (newBalance - amount < account.product.min_balance) {
            throw new Error(`Insufficient balance. Minimum balance required: ${account.product.min_balance}`);
        }

        newBalance -= amount;
        ledgerTxType = 'savings_withdrawal';
        // Debit Savings (Liability -), Credit Cash (Asset -)
        debitAccount = this.mapProductToLiabilityAccount(account.product.type);
        creditAccount = AccountCode.CASH_ON_HAND;
    }

    // 4. Perform Transaction (Best-effort sequence)
    
    // A. Create Transaction Record
    const { data: tx, error: txError } = await this.supabase
      .from('savings_transactions')
      .insert({
        koperasi_id: account.koperasi_id,
        account_id: accountId,
        member_id: account.member_id,
        type: type,
        amount: type === 'withdrawal' ? -amount : amount,
        balance_after: newBalance,
        description: description || `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} via System`,
        created_by: userId
      })
      .select()
      .single();

    if (txError) throw new Error(`Failed to record transaction: ${txError.message}`);

    // B. Update Account Balance
    const { error: updateError } = await this.supabase
      .from('savings_accounts')
      .update({
        balance: newBalance,
        last_transaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    if (updateError) {
        // Rollback tx (manual)
        await this.supabase.from('savings_transactions').delete().eq('id', tx.id);
        throw new Error(`Failed to update balance: ${updateError.message}`);
    }

    // C. Trigger Ledger
    try {
      await this.ledgerService.recordTransaction({
        koperasi_id: account.koperasi_id,
        tx_type: ledgerTxType,
        tx_reference: tx.id, // Use transaction ID as ref
        account_debit: debitAccount,
        account_credit: creditAccount,
        amount: amount,
        description: description || `${type} for Account ${account.account_number}`,
        source_table: 'savings_transactions',
        source_id: tx.id,
        created_by: userId
      });
    } catch (ledgerError) {
        console.error("Ledger Recording Failed:", ledgerError);
        // Critical error, but balance is updated.
    }

    return { transaction: tx, newBalance };
  }

  private mapProductToLiabilityAccount(type: string): AccountCode {
      switch (type) {
          case 'pokok': return AccountCode.SAVINGS_PRINCIPAL;
          case 'wajib': return AccountCode.SAVINGS_MANDATORY;
          case 'sukarela': return AccountCode.SAVINGS_VOLUNTARY;
          default: return AccountCode.SAVINGS_VOLUNTARY; // Fallback
      }
  }
}
