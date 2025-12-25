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
    description?: string,
    skipLedger: boolean = false
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
        const minDeposit = Number(account.product?.min_deposit ?? 0);
        if (minDeposit > 0 && amount < minDeposit) {
            throw new Error(`Kurang dari minimum setoran untuk produk ${account.product.name}`);
        }
        const maxDeposit = Number(account.product?.max_deposit ?? 0);
        if (maxDeposit > 0 && amount > maxDeposit) {
            throw new Error(`Melebihi batas maksimum setoran untuk produk ${account.product.name}`);
        }
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
    if (!skipLedger) {
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
    }

    return { transaction: tx, newBalance };
  }

  async processMonthlyMandatorySavingsDeduction(
    koperasiId: string,
    amount: number,
    userId: string
  ) {
    // 1. Get all active members with both Voluntary and Mandatory accounts
    // We need to fetch members who have ACTIVE Mandatory Savings Product
    // And have enough balance in Voluntary Savings.

    // A. Get Mandatory Product for this Koperasi
    const { data: mandatoryProduct } = await this.supabase
        .from('savings_products')
        .select('id, name')
        .eq('koperasi_id', koperasiId)
        .eq('type', 'wajib')
        .eq('is_active', true)
        .single();

    if (!mandatoryProduct) throw new Error("No active Mandatory Savings product found");

    // B. Get Voluntary Product
    const { data: voluntaryProduct } = await this.supabase
        .from('savings_products')
        .select('id')
        .eq('koperasi_id', koperasiId)
        .eq('type', 'sukarela')
        .eq('is_active', true)
        .single();

    if (!voluntaryProduct) throw new Error("No active Voluntary Savings product found for source of funds");

    // C. Get Accounts
    // We want accounts where member has both.
    // This query is complex in Supabase JS. Let's fetch all Voluntary with balance >= amount.
    const { data: sourceAccounts, error: sourceError } = await this.supabase
        .from('savings_accounts')
        .select('id, member_id, balance, account_number')
        .eq('product_id', voluntaryProduct.id)
        .gte('balance', amount)
        .eq('status', 'active');

    if (sourceError) throw sourceError;
    if (!sourceAccounts || sourceAccounts.length === 0) return { processed: 0, failed: 0, message: "No eligible accounts found" };

    let processed = 0;
    let failed = 0;

    // Process each member
    for (const sourceAcc of sourceAccounts) {
        try {
            // Find destination account (Mandatory) for this member
            const { data: destAcc } = await this.supabase
                .from('savings_accounts')
                .select('id, account_number')
                .eq('member_id', sourceAcc.member_id)
                .eq('product_id', mandatoryProduct.id)
                .eq('status', 'active')
                .single();

            if (!destAcc) {
                // Skip if member doesn't have mandatory account open
                continue; 
            }

            // Perform Transfer
            // 1. Withdraw from Voluntary
            await this.processTransaction(
                sourceAcc.id,
                amount,
                'withdrawal',
                userId,
                `Autodebet Simpanan Wajib to ${destAcc.account_number}`,
                true // Skip ledger here, we will do a combined or separate ledger entry? 
                     // Actually processTransaction does ledger. 
                     // If we skip, we can do a cleaner "Transfer" ledger entry (Dr Vol, Cr Man).
                     // If we don't skip, we get (Dr Vol, Cr Cash) and (Dr Cash, Cr Man). Net effect is same but Cash wash.
                     // Better to skip ledger in individual steps and do one Transfer entry?
                     // Or just let it wash through Cash (easier for reconciliation if cash actually moved conceptually).
                     // But here it's internal transfer.
                     // Let's use `skipLedger=true` and record a Journal Adjustment or Transfer.
            );

            // 2. Deposit to Mandatory
            await this.processTransaction(
                destAcc.id,
                amount,
                'deposit',
                userId,
                `Autodebet Simpanan Wajib from ${sourceAcc.account_number}`,
                true
            );

            // 3. Record Ledger: Debit Voluntary (Liability -), Credit Mandatory (Liability +)
            await this.ledgerService.recordTransaction({
                koperasi_id: koperasiId,
                tx_type: 'journal_adjustment', // Or specific type
                tx_reference: `AUTODEBET-${sourceAcc.member_id}-${Date.now()}`,
                account_debit: AccountCode.SAVINGS_VOLUNTARY,
                account_credit: AccountCode.SAVINGS_MANDATORY,
                amount: amount,
                description: `Autodebet Simpanan Wajib Member ${sourceAcc.member_id}`,
                source_table: 'savings_accounts',
                source_id: destAcc.id,
                created_by: userId
            });

            processed++;
        } catch (err) {
            console.error(`Failed autodebet for member ${sourceAcc.member_id}:`, err);
            failed++;
        }
    }

    return { processed, failed };
  }

  private mapProductToLiabilityAccount(type: string): AccountCode {
      switch (type) {
          case 'pokok': return AccountCode.SAVINGS_PRINCIPAL;
          case 'wajib': return AccountCode.SAVINGS_MANDATORY;
          case 'sukarela': return AccountCode.SAVINGS_VOLUNTARY;
          case 'rencana': return AccountCode.SAVINGS_PLANNED;
          case 'berjangka': return AccountCode.SAVINGS_TIME;
          default: return AccountCode.SAVINGS_VOLUNTARY; // Fallback
      }
  }
}
