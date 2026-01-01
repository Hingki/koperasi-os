import { SupabaseClient } from '@supabase/supabase-js';
import { AccountingService } from '@/lib/services/accounting-service';
import { LedgerIntentService } from '@/lib/services/ledger-intent-service';
import { AccountCode } from '@/lib/types/ledger';
import { randomUUID } from 'crypto';

export class SavingsService {
  constructor(private supabase: SupabaseClient) { }

  async getVoluntaryAccount(memberId: string) {
    const { data: account, error } = await this.supabase
      .from('savings_accounts')
      .select('id, koperasi_id, balance, product:savings_products!inner(type)')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .eq('product.type', 'sukarela')
      .single();

    if (error) return null;
    return account;
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
    userId?: string,
    skipLedger: boolean = false
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

    // 2. Update Balance via Process Transaction (Ledger First)
    // We delegate to processTransaction which now handles Ledger correctly.
    // Note: This treats it as a Cash Withdrawal. If this is for internal payment, 
    // we assume a "Cash Wash" approach for now (Withdrawal -> Payment).
    await this.processTransaction(
      account.id,
      amount,
      'withdrawal',
      userId || 'system',
      description,
      'CASH',
      skipLedger // Respect skipLedger flag
    );

    /* OLD DIRECT UPDATE REMOVED
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
    // ... (Old logic was here)
    */
  }

  async processTransaction(
    accountId: string,
    amount: number,
    type: 'deposit' | 'withdrawal',
    userId: string,
    description?: string,
    paymentMethod: 'CASH' | 'TRANSFER' = 'CASH',
    skipLedger: boolean = false,
    skipValidation: boolean = false
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

    if (type === 'deposit') {
      if (!skipValidation) {
        const minDeposit = Number(account.product?.min_deposit ?? 0);
        if (minDeposit > 0 && amount < minDeposit) {
          throw new Error(`Kurang dari minimum setoran untuk produk ${account.product.name}`);
        }
        const maxDeposit = Number(account.product?.max_deposit ?? 0);
        if (maxDeposit > 0 && amount > maxDeposit) {
          throw new Error(`Melebihi batas maksimum setoran untuk produk ${account.product.name}`);
        }
      }
      newBalance += amount;
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
    }

    // 4. Perform Transaction (Ledger-First Sequence)
    const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo';
    let journalId: string | null = null;
    const transactionId = randomUUID(); // Generate ID upfront for consistency

    // A. Ledger Execution (The Gatekeeper)
    if (!skipLedger) {
      try {
        let journalDTO;
        if (type === 'deposit') {
          journalDTO = await LedgerIntentService.prepareSavingsDeposit(
            account.koperasi_id,
            transactionId,
            amount,
            paymentMethod === 'CASH' ? 'cash' : 'transfer',
            account.member_id,
            accountId,
            userId
          );
        } else {
          journalDTO = await LedgerIntentService.prepareSavingsWithdrawal(
            account.koperasi_id,
            transactionId,
            amount,
            paymentMethod === 'CASH' ? 'cash' : 'transfer',
            account.member_id,
            accountId,
            userId
          );
        }

        // Post Journal - If this fails, process stops here.
        journalId = await AccountingService.postJournal(journalDTO, this.supabase);

      } catch (error: any) {
        console.error("Ledger Gatekeeper Failed:", error);
        throw new Error(`Transaksi Ditolak oleh Sistem Akuntansi: ${error.message}`);
      }
    }

    // B. Create Business Transaction Record
    let tx: any | null = null;
    let txInsertError: any | null = null;

    // Construct transaction data
    const txData = {
      id: transactionId, // Use the pre-generated ID
      koperasi_id: account.koperasi_id,
      account_id: accountId,
      member_id: account.member_id,
      type: type,
      amount: type === 'withdrawal' ? -amount : amount,
      balance_after: newBalance,
      description: description || `${type === 'deposit' ? 'Deposit' : 'Withdrawal'} via System`,
      created_by: userId,
      is_test_transaction: isDemoMode,
      // We might want to store journalId if schema allows, but for now we proceed without strictly linking in DB
    };

    try {
      const res = await this.supabase
        .from('savings_transactions')
        .insert(txData)
        .select()
        .single();
      tx = res.data;
      txInsertError = res.error;
    } catch (err: any) {
      // Retry logic for is_test_transaction column
      if (String(err?.message || '').includes('column "is_test_transaction"')) {
        const { is_test_transaction, ...retryData } = txData;
        const res = await this.supabase
          .from('savings_transactions')
          .insert(retryData)
          .select()
          .single();
        tx = res.data;
        txInsertError = res.error;
      } else {
        // CRITICAL: Ledger posted but Transaction failed.
        if (journalId) {
          try {
            await AccountingService.voidJournal(journalId, 'Transaction record creation failed', this.supabase);
            console.log(`Journal ${journalId} reversed due to transaction creation failure.`);
          } catch (voidError) {
            console.error(`CRITICAL: Failed to post reversal for journal ${journalId} after transaction error!`, voidError);
          }
        }
        throw new Error(`System Error: Ledger posted (ID: ${journalId}) but transaction record failed: ${err.message}`);
      }
    }

    if (txInsertError) {
      if (journalId) {
        try {
          await AccountingService.voidJournal(journalId, 'Transaction record creation failed', this.supabase);
          console.log(`Journal ${journalId} reversed due to transaction creation failure.`);
        } catch (voidError) {
          console.error(`CRITICAL: Failed to post reversal for journal ${journalId} after transaction error!`, voidError);
        }
      }
      throw new Error(`System Error: Ledger posted (ID: ${journalId}) but transaction record failed: ${txInsertError.message}`);
    }

    // C. Update Account Balance (State Change)
    // DEPRECATED: Balance is now updated via Ledger Trigger (update_savings_balance_from_ledger)
    // We only need to fetch the latest balance for the return value and consistency check.

    const { data: updatedAccount, error: fetchError } = await this.supabase
      .from('savings_accounts')
      .select('balance')
      .eq('id', accountId)
      .single();

    if (fetchError || !updatedAccount) {
      // If we can't fetch, we can't be sure, but Ledger post succeeded.
      // We'll return the estimated balance.
      console.warn(`Could not fetch updated balance for account ${accountId} after ledger post.`);
    } else {
      newBalance = updatedAccount.balance;
    }

    /* 
    // OLD LOGIC REMOVED
    const { error: updateError } = await this.supabase
      .from('savings_accounts')
      .update({
        balance: newBalance,
        last_transaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);
    */

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
          'CASH',
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
          'CASH',
          true
        );

        // 3. Record Ledger: Debit Voluntary (Liability -), Credit Mandatory (Liability +)
        try {
          const debitAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.SAVINGS_VOLUNTARY, this.supabase);
          const creditAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.SAVINGS_MANDATORY, this.supabase);

          if (debitAccId && creditAccId) {
            await AccountingService.postJournal({
              koperasi_id: koperasiId,
              business_unit: 'SIMPAN_PINJAM',
              transaction_date: new Date().toISOString().split('T')[0],
              description: `Autodebet Simpanan Wajib Member ${sourceAcc.member_id}`,
              reference_id: `AUTODEBET-${sourceAcc.member_id}-${Date.now()}`,
              reference_type: 'SAVINGS_AUTODEBIT',
              lines: [
                { 
                  account_id: debitAccId, 
                  debit: amount, 
                  credit: 0,
                  entity_id: sourceAcc.id,
                  entity_type: 'savings_account'
                },
                { 
                  account_id: creditAccId, 
                  debit: 0, 
                  credit: amount,
                  entity_id: destAcc.id,
                  entity_type: 'savings_account'
                }
              ]
            }, this.supabase);
          }
        } catch (err) {
          console.error('Failed to record autodebit ledger:', err);
        }

        processed++;
      } catch (err) {
        console.error(`Failed autodebet for member ${sourceAcc.member_id}:`, err);
        failed++;
      }
    }

    return { processed, failed };
  }

  async distributeMonthlyInterest(
    koperasiId: string,
    productType: 'sukarela' | 'berjangka' | 'rencana',
    annualRatePercentage: number,
    userId: string
  ) {
    // 1. Get Product
    const { data: product } = await this.supabase
      .from('savings_products')
      .select('id, name')
      .eq('koperasi_id', koperasiId)
      .eq('type', productType)
      .eq('is_active', true)
      .single();

    if (!product) throw new Error(`No active ${productType} product found`);

    // 2. Get Accounts
    const { data: accounts, error } = await this.supabase
      .from('savings_accounts')
      .select('id, member_id, balance, account_number')
      .eq('product_id', product.id)
      .eq('status', 'active')
      .gt('balance', 0);

    if (error) throw error;
    if (!accounts || accounts.length === 0) return { processed: 0, totalInterest: 0, errors: [] };

    let processed = 0;
    let totalInterest = 0;
    const errors: any[] = [];

    // 3. Process
    for (const account of accounts) {
      try {
        // Simple calculation: Balance * (Rate/100) / 12
        const interestAmount = Math.floor(account.balance * (annualRatePercentage / 100) / 12);

        if (interestAmount <= 0) continue;

        // Deposit Interest (Skip Ledger & Validation)
        await this.processTransaction(
          account.id,
          interestAmount,
          'deposit',
          userId,
          `Bunga Simpanan ${product.name}`,
          'CASH',
          true, // Skip default ledger
          true  // Skip validation (min deposit)
        );

        // Create Ledger Entry: Dr Interest Expense, Cr Savings Liability
        const debitAccount = AccountCode.INTEREST_EXPENSE_SAVINGS;
        const creditAccount = this.mapProductToLiabilityAccount(productType);

        const debitAccId = await AccountingService.getAccountIdByCode(koperasiId, debitAccount, this.supabase);
        const creditAccId = await AccountingService.getAccountIdByCode(koperasiId, creditAccount, this.supabase);

        if (debitAccId && creditAccId) {
          await AccountingService.postJournal({
            koperasi_id: koperasiId,
            business_unit: 'SIMPAN_PINJAM',
            transaction_date: new Date().toISOString().split('T')[0],
            description: `Bunga Simpanan ${product.name} - ${account.account_number}`,
            reference_id: `INTEREST-${account.id}-${Date.now()}`,
            reference_type: 'SAVINGS_INTEREST',
            lines: [
              { account_id: debitAccId, debit: interestAmount, credit: 0 },
              { 
                account_id: creditAccId, 
                debit: 0, 
                credit: interestAmount,
                entity_id: account.id,
                entity_type: 'savings_account'
              }
            ],
            created_by: userId
          }, this.supabase);
        }

        processed++;
        totalInterest += interestAmount;

      } catch (err) {
        console.error(`Failed to distribute interest for account ${account.id}:`, err);
        errors.push({ accountId: account.id, error: err });
      }
    }

    return { processed, totalInterest, errors };
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
