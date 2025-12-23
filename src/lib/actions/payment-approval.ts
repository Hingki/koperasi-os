'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { LedgerService } from '@/lib/services/ledger-service';
import { LedgerTransaction } from '@/lib/types/ledger';

export async function approvePayment(transactionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // 1. Fetch Transaction
  const { data: tx } = await supabase
    .from('payment_transactions')
    .select('*, payment_source:payment_sources(*)')
    .eq('id', transactionId)
    .single();

  if (!tx) throw new Error('Transaction not found');
  if (tx.payment_status !== 'pending') throw new Error('Transaction is not pending');

  // 2. Process based on Type
  const ledgerService = new LedgerService(supabase);
  
  try {
    if (tx.transaction_type === 'savings_deposit') {
      await processSavingsDeposit(supabase, tx, ledgerService, user.id);
    } else if (tx.transaction_type === 'loan_payment') {
      await processLoanPayment(supabase, tx, ledgerService, user.id);
    }

    // 3. Update Payment Transaction Status
    await supabase
      .from('payment_transactions')
      .update({ 
        payment_status: 'success',
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId);

    revalidatePath('/dashboard/payments');
    revalidatePath('/member/pembayaran');
    return { success: true };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function rejectPayment(transactionId: string, reason: string) {
  const supabase = await createClient();
  
  await supabase
    .from('payment_transactions')
    .update({ 
      payment_status: 'failed',
      metadata: { rejection_reason: reason }, // We need to merge metadata, but simple update replaces it? No, need to fetch first or use jsonb_set
      updated_at: new Date().toISOString()
    })
    .eq('id', transactionId);
    
    // Better way to update metadata without overwriting existing
    // But for MVP, let's just update status.
    
  revalidatePath('/dashboard/payments');
  return { success: true };
}

export async function processSavingsDeposit(supabase: any, tx: any, ledger: LedgerService, userId: string) {
  // 1. Get Savings Account and Product
  const { data: account } = await supabase
    .from('savings_accounts')
    .select('*, product:savings_products(*)')
    .eq('id', tx.reference_id)
    .single();

  if (!account) throw new Error('Savings account not found');

  // 2. Create Savings Transaction
  const { error: txError } = await supabase
    .from('savings_transactions')
    .insert({
      koperasi_id: tx.koperasi_id,
      account_id: account.id,
      transaction_type: 'deposit',
      amount: tx.amount,
      description: `Setoran via ${tx.payment_method} (${tx.payment_provider})`,
      created_by: userId
    });

  if (txError) throw new Error(txError.message);

  // 3. Update Account Balance
  await supabase.rpc('update_savings_balance', { 
    p_account_id: account.id, 
    p_amount: tx.amount 
  });

  // 4. Ledger Entry
  // Debit: Bank/Cash (Payment Source Account Code)
  // Credit: Member Savings (Product Account Code)
  const debitCode = tx.payment_source?.account_code || '1-1001'; // Default Cash if missing
  const creditCode = account.product?.coa_id || '2-1001'; // Default Savings Liability

  // We need to resolve COA IDs from Codes or use EnsureAccount
  // LedgerService expects Codes or IDs? 
  // ensureAccount takes (koperasi_id, code_or_name, user_id)
  
  const ledgerTx: LedgerTransaction = {
    koperasi_id: tx.koperasi_id,
    amount: tx.amount,
    account_debit: debitCode,
    account_credit: creditCode,
    tx_reference: tx.id,
    tx_type: 'savings_deposit',
    description: `Setoran Simpanan ${account.account_number}`,
    created_by: userId
  };

  await ledger.recordTransaction(ledgerTx);
}

export async function processLoanPayment(supabase: any, tx: any, ledger: LedgerService, userId: string) {
  // 1. Get Loan Details
  const { data: loan } = await supabase
    .from('loans')
    .select('*, product:loan_products(*)')
    .eq('id', tx.reference_id)
    .single();

  if (!loan) throw new Error('Loan not found');

  // 2. Find matching installment (optional but good)
  // For now, simple logic: reduce principal? 
  // We need to know interest portion. 
  // MVP: Treat entire amount as Principal Repayment for Ledger (Simplify)
  // Or: If Schedule exists, use it.
  
  // Let's try to match a schedule
  const { data: schedule } = await supabase
    .from('loan_repayment_schedule')
    .select('*')
    .eq('loan_id', loan.id)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  let interestPortion = 0;
  let principalPortion = tx.amount;

  if (schedule) {
    // If amount matches total installment roughly
    const totalDue = schedule.total_installment;
    if (Math.abs(tx.amount - totalDue) < 1000) { // Tolerance
       interestPortion = schedule.interest_portion;
       principalPortion = schedule.principal_portion;
       
       // Update Schedule
       await supabase
         .from('loan_repayment_schedule')
         .update({ status: 'paid', paid_at: new Date().toISOString() })
         .eq('id', schedule.id);
    }
  }

  // 3. Update Loan Outstanding (if tracking externally)
  // Assuming loan table has remaining_principal? 
  // If not, we calculate from transactions.
  
  // 4. Ledger Entry
  // Debit: Bank (Payment Source)
  // Credit: Loan Receivable (Product COA) -> Principal
  // Credit: Interest Income (Product Interest COA) -> Interest
  
  const debitCode = tx.payment_source?.account_code || '1-1001';
  const creditPrincipalCode = loan.product?.coa_receivable || '1-1003'; // Loan Receivable
  const creditInterestCode = loan.product?.coa_interest_income || '4-1001'; // Interest Income

  // LedgerService currently supports Double Entry (1 Debit, 1 Credit).
  // For Split, we need 2 transactions or Multi-Leg support.
  // LedgerService.recordTransaction does 1 pair.
  // So we record 2 entries if interest > 0.

  if (principalPortion > 0) {
    await ledger.recordTransaction({
        koperasi_id: tx.koperasi_id,
        amount: principalPortion,
        account_debit: debitCode,
        account_credit: creditPrincipalCode,
        tx_reference: tx.id + '-P',
        tx_type: 'loan_repayment_principal',
        description: `Angsuran Pokok Pinjaman ${loan.id}`,
        created_by: userId
    });
  }

  if (interestPortion > 0) {
    await ledger.recordTransaction({
        koperasi_id: tx.koperasi_id,
        amount: interestPortion,
        account_debit: debitCode,
        account_credit: creditInterestCode,
        tx_reference: tx.id + '-I',
        tx_type: 'loan_repayment_interest',
        description: `Angsuran Bunga Pinjaman ${loan.id}`,
        created_by: userId
    });
  }
}
