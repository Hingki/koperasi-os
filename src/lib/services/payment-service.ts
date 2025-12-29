import { SupabaseClient } from '@supabase/supabase-js';
import {
  PaymentProviderType,
  QRISPaymentParams,
  QRISResponse,
  VAPaymentParams,
  VAResponse,
  PaymentCallback,
  PaymentStatus,
  PaymentTransaction
} from '@/lib/types/payment';
import { AccountingService } from './accounting-service';
import { LedgerIntentService } from './ledger-intent-service';
import { AccountCode } from '@/lib/types/ledger';
import { SavingsService } from '@/lib/services/savings-service';

// --- Abstract Provider ---
export abstract class PaymentProvider {
  abstract generateQRIS(params: QRISPaymentParams): Promise<QRISResponse>;
  abstract generateVA(params: VAPaymentParams): Promise<VAResponse>;
  abstract handleWebhook(payload: any): Promise<PaymentCallback>;
  abstract checkStatus(transactionId: string): Promise<PaymentStatus>;
}

// --- Mock Provider (for Development) ---
export class MockPaymentProvider extends PaymentProvider {
  async generateQRIS(params: QRISPaymentParams): Promise<QRISResponse> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (params.expires_in_minutes || 15));

    return {
      transaction_id: params.transaction_id,
      external_id: `MOCK-QR-${Date.now()}`,
      qr_string: `00020101021226580016ID.CO.MOCK.WWW01189360091530000000005204599953033605802ID5912MOCK MERCHANT6007JAKARTA6107123456762070703A016304${Math.floor(Math.random() * 9999)}`,
      qr_image_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=MOCK-PAYMENT-${params.amount}`,
      status: 'pending',
      expires_at: expiresAt.toISOString()
    };
  }

  async generateVA(params: VAPaymentParams): Promise<VAResponse> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + (params.expires_in_minutes || 60));

    return {
      transaction_id: params.transaction_id,
      external_id: `MOCK-VA-${Date.now()}`,
      va_number: `8888${Math.floor(1000000000 + Math.random() * 9000000000)}`, // Random 10 digit VA
      bank_code: params.bank_code,
      status: 'pending',
      expires_at: expiresAt.toISOString()
    };
  }

  async handleWebhook(payload: any): Promise<PaymentCallback> {
    // Mock webhook payload structure: { external_id: string, status: string, amount: number }
    return {
      transaction_id: payload.transaction_id || '', // Should be mapped if possible, or looked up
      external_id: payload.external_id,
      status: payload.status as PaymentStatus,
      amount: payload.amount,
      paid_at: new Date().toISOString(),
      raw_payload: payload
    };
  }

  async checkStatus(transactionId: string): Promise<PaymentStatus> {
    // For mock, we can randomly return success or pending, or check DB. 
    // In a real mock scenario, maybe we trigger it via a special API call.
    // For now, let's assume it stays pending unless webhook is called.
    return 'pending';
  }
}

// --- Xendit Provider (Skeleton) ---
export class XenditProvider extends PaymentProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  async generateQRIS(params: QRISPaymentParams): Promise<QRISResponse> {
    // TODO: Call Xendit API /qr_codes
    throw new Error('Xendit Provider not implemented yet');
  }

  async generateVA(params: VAPaymentParams): Promise<VAResponse> {
    // TODO: Call Xendit API /callback_virtual_accounts
    throw new Error('Xendit Provider not implemented yet');
  }

  async handleWebhook(payload: any): Promise<PaymentCallback> {
    // TODO: Parse Xendit Webhook
    throw new Error('Xendit Provider not implemented yet');
  }

  async checkStatus(transactionId: string): Promise<PaymentStatus> {
    // TODO: Call Xendit API /transactions
    throw new Error('Xendit Provider not implemented yet');
  }
}

// --- Midtrans Provider (Skeleton) ---
export class MidtransProvider extends PaymentProvider {
  private serverKey: string;

  constructor(serverKey: string) {
    super();
    this.serverKey = serverKey;
  }

  async generateQRIS(params: QRISPaymentParams): Promise<QRISResponse> {
    // TODO: Call Midtrans Snap / Core API
    throw new Error('Midtrans Provider not implemented yet');
  }

  async generateVA(params: VAPaymentParams): Promise<VAResponse> {
    // TODO: Call Midtrans Core API
    throw new Error('Midtrans Provider not implemented yet');
  }

  async handleWebhook(payload: any): Promise<PaymentCallback> {
    // TODO: Parse Midtrans Notification
    throw new Error('Midtrans Provider not implemented yet');
  }

  async checkStatus(transactionId: string): Promise<PaymentStatus> {
    // TODO: Call Midtrans Status API
    throw new Error('Midtrans Provider not implemented yet');
  }
}

// --- Main Service ---
export class PaymentService {
  private provider: PaymentProvider;
  private savingsService: SavingsService;
  private agentUrl?: string;
  private agentToken?: string;

  constructor(
    private supabase: SupabaseClient,
    providerType: PaymentProviderType = 'mock'
  ) {
    this.savingsService = new SavingsService(supabase);
    this.agentUrl = process.env.AGENT_WEBHOOK_URL;
    this.agentToken = process.env.AGENT_TOKEN;
    // Factory for providers
    switch (providerType) {
      case 'xendit':
        this.provider = new XenditProvider(process.env.XENDIT_SECRET_KEY || '');
        break;
      case 'midtrans':
        this.provider = new MidtransProvider(process.env.MIDTRANS_SERVER_KEY || '');
        break;
      case 'mock':
      default:
        this.provider = new MockPaymentProvider();
        break;
    }
  }

  /**
   * Initializes a QRIS payment transaction.
   * 1. Creates a record in payment_transactions table
   * 2. Calls the provider to generate QR code
   * 3. Updates the record with QR details
   */
  async createQRISPayment(
    koperasiId: string,
    referenceId: string,
    transactionType: 'retail_sale' | 'loan_payment' | 'savings_deposit' | 'rental_payment',
    amount: number,
    description?: string,
    createdBy?: string
  ): Promise<PaymentTransaction> {

    // 1. Create Initial Record
    const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo';

    const { data: trx, error: createError } = await this.supabase
      .from('payment_transactions')
      .insert({
        koperasi_id: koperasiId,
        transaction_type: transactionType,
        reference_id: referenceId,
        payment_method: 'qris',
        payment_provider: isDemoMode ? 'mock' : 'qris', // Or keep original provider name but flag as test
        amount: amount,
        status: 'pending',
        description: description,
        created_by: createdBy,
        is_test_transaction: isDemoMode
      })
      .select()
      .single();

    if (createError) throw new Error(`Failed to create payment record: ${createError.message}`);

    // 2. Call Provider
    try {
      const qrisResponse = await this.provider.generateQRIS({
        transaction_id: trx.id,
        amount: amount,
        description: description,
        expires_in_minutes: 15
      });

      // 3. Update Record
      const { data: updatedTrx, error: updateError } = await this.supabase
        .from('payment_transactions')
        .update({
          external_id: qrisResponse.external_id,
          qr_code_url: qrisResponse.qr_image_url,
          expired_at: qrisResponse.expires_at,
          metadata: { qr_string: qrisResponse.qr_string }
        })
        .eq('id', trx.id)
        .select()
        .single();

      if (updateError) throw new Error(`Failed to update payment with QRIS data: ${updateError.message}`);

      await this.notifyAgent('qris_generated', { transaction: updatedTrx });

      return updatedTrx;

    } catch (err: any) {
      // Mark as failed if provider fails
      await this.supabase
        .from('payment_transactions')
        .update({ status: 'failed', metadata: { error: err.message } })
        .eq('id', trx.id);
      throw err;
    }
  }

  /**
   * Processes a webhook payload from a provider
   */
  async processWebhook(payload: any): Promise<PaymentTransaction> {
    // 1. Parse payload via provider
    const callbackData = await this.provider.handleWebhook(payload);

    // 2. Find Transaction
    // We try to find by ID (if we passed it in payload) or external_id
    let query = this.supabase.from('payment_transactions').select('*');

    if (callbackData.transaction_id) {
      query = query.eq('id', callbackData.transaction_id);
    } else {
      query = query.eq('external_id', callbackData.external_id);
    }

    const { data: trx, error } = await query.single();

    if (error || !trx) {
      throw new Error(`Transaction not found for webhook: ${JSON.stringify(callbackData)}`);
    }

    // 3. Update Status if changed
    if (trx.status !== callbackData.status) {
      const updatedTrx = await this.updatePaymentStatus(trx.id, callbackData.status, callbackData.raw_payload);

      // 4. Handle Post Payment Logic (Journal, Business Logic)
      if (callbackData.status === 'success') {
        await this.handlePostPaymentSuccess(updatedTrx);
      }

      return updatedTrx;
    }

    return trx;
  }

  /**
   * Handles business logic after successful payment
   * ENFORCES LEDGER-FIRST: Journal -> State Change
   */
  async handlePostPaymentSuccess(transaction: PaymentTransaction) {
    // 1. Savings Deposit
    if (transaction.transaction_type === 'savings_deposit') {
      // Delegate to SavingsService (which is Ledger-First)
      // We map payment method to 'CASH' or 'TRANSFER' for SavingsService
      const method = ['qris', 'va', 'transfer'].includes(transaction.payment_method) ? 'TRANSFER' : 'CASH';
      // Note: SavingsService.processTransaction takes (accountId, amount, type, userId, desc, method)
      await this.savingsService.processTransaction(
        transaction.reference_id,
        transaction.amount,
        'deposit',
        transaction.created_by || 'system',
        `Setoran via ${transaction.payment_method.toUpperCase()}`,
        method
      );
    }
    // 2. Loan Payment
    else if (transaction.transaction_type === 'loan_payment') {
      // Delegate to LoanService (which should be Ledger-First)
      const { LoanService } = await import('@/lib/services/loan-service');
      const loanService = new LoanService(this.supabase);

      let sourceAccount = AccountCode.CASH_ON_HAND;
      if (['qris', 'va', 'transfer'].includes(transaction.payment_method)) {
        sourceAccount = AccountCode.BANK_BCA;
      }

      await loanService.processPaymentByLoanId(
        transaction.reference_id,
        transaction.amount,
        transaction.created_by || 'system',
        sourceAccount
      );
    }
    // 3. Retail Sale & 4. Rental
    else {
      // For Retail and Rental, we handle Journal here manually because they might not have a dedicated service method for "Post-Payment State Change" that includes Journal.
      // Actually RetailService has processTransaction but that's for creating the sale. Here we are just paying it (if it was pending).
      // If Retail Sale was "Pending" (e.g. QRIS), we now finalize it.

      // LEDGER FIRST
      let journalId: string | null = null;
      try {
        await this.createJournalEntry(transaction);
        // We need to capture journalId if createJournalEntry returned it, but it returns void.
        // Assumption: createJournalEntry throws if fails.
      } catch (err) {
        throw err;
      }

      // STATE CHANGE
      try {
        if (transaction.transaction_type === 'retail_sale' && transaction.reference_id) {
          await this.supabase.from('pos_transactions')
            .update({ payment_status: 'paid' })
            .eq('id', transaction.reference_id);
        } else if (transaction.transaction_type === 'rental_payment' && transaction.reference_id) {
          await this.supabase.from('rental_bookings')
            .update({ payment_status: 'paid' })
            .eq('id', transaction.reference_id);
        }
      } catch (stateError) {
        console.error("State update failed after Ledger posted. Ideally we should void the journal here, but we don't have the ID easily without refactoring createJournalEntry.");
        // For now, we throw. This might leave a ghost journal, but it's better than state change without journal.
        // TODO: Refactor createJournalEntry to return ID and implement Void here.
        throw stateError;
      }
    }

    await this.notifyAgent(transaction.transaction_type, { transaction });
  }

  /**
   * Updates payment status based on webhook or manual check
   */
  async updatePaymentStatus(transactionId: string, status: PaymentStatus, payload?: any) {
    const { data, error } = await this.supabase
      .from('payment_transactions')
      .update({
        status: status,
        webhook_payload: payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Helper to get provider instance if needed directly
   */
  getProvider(): PaymentProvider {
    return this.provider;
  }

  /**
   * Processes a payment via the Koperasi Mobile App (using Savings Balance)
   */
  async processAppPayment(
    koperasiId: string,
    memberId: string,
    amount: number,
    transactionType: 'retail_sale' | 'loan_payment' | 'savings_deposit' | 'rental_payment',
    referenceId: string,
    description?: string,
    userId?: string
  ): Promise<PaymentTransaction> {
    // 1. Deduct Balance (Simpanan Sukarela)
    await this.savingsService.deductBalance(
      memberId,
      amount,
      description || `App Payment for ${transactionType}`,
      userId
    );

    // 2. Record Payment & Ledger
    return await this.recordManualPayment(
      koperasiId,
      referenceId,
      transactionType,
      amount,
      'savings_balance',
      description || `App Payment for ${transactionType}`,
      userId
    );
  }

  /**
   * Records a manual payment (Cash, Savings, etc)
   */
  async recordManualPayment(
    koperasiId: string,
    referenceId: string,
    transactionType: 'retail_sale' | 'loan_payment' | 'savings_deposit' | 'rental_payment',
    amount: number,
    paymentMethod: 'cash' | 'savings_balance' | 'transfer',
    description?: string,
    createdBy?: string,
    skipJournal: boolean = false
  ): Promise<PaymentTransaction> {

    // 1. Ledger Gatekeeper (Ledger-First)
    let journalId: string | null = null;
    if (!skipJournal) {
      try {
        // We need to use LedgerIntentService directly here since we don't have the Transaction object yet
        const journalDTO = await LedgerIntentService.preparePaymentReceipt(
          koperasiId,
          amount,
          paymentMethod,
          transactionType,
          referenceId,
          createdBy || 'system'
        );
        journalId = await AccountingService.postJournal(journalDTO, this.supabase);
      } catch (ledgerError: any) {
        throw new Error(`Payment Journal Failed: ${ledgerError.message}`);
      }
    }

    // 2. Create Payment Record (Operational State)
    const { data: trx, error } = await this.supabase
      .from('payment_transactions')
      .insert({
        koperasi_id: koperasiId,
        transaction_type: transactionType,
        reference_id: referenceId,
        payment_method: paymentMethod,
        payment_provider: 'manual',
        amount: amount,
        status: 'success', // Manual payments are usually instant success
        description: description,
        created_by: createdBy
      })
      .select()
      .single();

    if (error) {
      // Post reversal if DB insert fails
      if (journalId) {
        await AccountingService.voidJournal(journalId, 'Manual payment insert failed', this.supabase);
      }
      throw new Error(`Failed to record manual payment: ${error.message}`);
    }

    await this.notifyAgent('payment_success', { transaction: trx });

    return trx;
  }

  /**
   * Records the journal entry for a successful payment
   */
  async createJournalEntry(transaction: PaymentTransaction): Promise<string> {
    const { payment_method, amount, reference_id, transaction_type, koperasi_id, created_by } = transaction;

    try {
      // Use LedgerIntentService to ensure compliance and validity
      const journalDTO = await LedgerIntentService.preparePaymentReceipt(
        koperasi_id,
        amount,
        payment_method,
        transaction_type,
        reference_id,
        created_by || 'system'
      );

      // Post the Journal
      const journalId = await AccountingService.postJournal(journalDTO, this.supabase);
      return journalId;

    } catch (error: any) {
      console.error('[PaymentService] Ledger Creation Failed:', error);
      // In a real system, we might want to flag the transaction as 'needs_journal' 
      // or throw error to trigger retry depending on context.
      // Since this is often called in background (webhook), throwing might be good to trigger retry.
      throw new Error(`Payment Journal Failed: ${error.message}`);
    }
  }

  private async notifyAgent(event: string, data: any) {
    if (!this.agentUrl) return;
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.agentToken) headers['Authorization'] = `Bearer ${this.agentToken}`;
      await fetch(this.agentUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ event, data })
      });
    } catch { }
  }
}
