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
import { LedgerService } from '@/lib/services/ledger-service';
import { AccountCode } from '@/lib/types/ledger';

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
  private ledgerService: LedgerService;
  
  constructor(
    private supabase: SupabaseClient,
    providerType: PaymentProviderType = 'mock'
  ) {
    this.ledgerService = new LedgerService(supabase);
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
    transactionType: 'retail_sale' | 'loan_payment' | 'savings_deposit',
    amount: number,
    description?: string,
    createdBy?: string
  ): Promise<PaymentTransaction> {
    
    // 1. Create Initial Record
    const { data: trx, error: createError } = await this.supabase
      .from('payment_transactions')
      .insert({
        koperasi_id: koperasiId,
        transaction_type: transactionType,
        reference_id: referenceId,
        payment_method: 'qris',
        payment_provider: 'mock', // Default to mock for now, or make this dynamic
        amount: amount,
        status: 'pending',
        description: description,
        created_by: createdBy
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
        
        // 4. Create Journal Entry if Success
        if (callbackData.status === 'success') {
            await this.createJournalEntry(updatedTrx);
        }
        
        return updatedTrx;
    }

    return trx;
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
   * Records a manual payment (Cash, Savings, etc)
   */
  async recordManualPayment(
    koperasiId: string,
    referenceId: string,
    transactionType: 'retail_sale' | 'loan_payment' | 'savings_deposit',
    amount: number,
    paymentMethod: 'cash' | 'savings_balance' | 'transfer',
    description?: string,
    createdBy?: string
  ): Promise<PaymentTransaction> {
    
    // 1. Create Payment Record
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

    if (error) throw new Error(`Failed to record manual payment: ${error.message}`);

    // 2. Create Journal Entry
    await this.createJournalEntry(trx);

    return trx;
  }

  /**
   * Records the journal entry for a successful payment
   */
  async createJournalEntry(transaction: PaymentTransaction): Promise<void> {
    const { payment_method, amount, reference_id, transaction_type, koperasi_id, created_by } = transaction;
    
    // Determine accounts based on method and transaction type
    let debitAccount: AccountCode;
    let creditAccount: AccountCode;

    // 1. Debit Side (Where money comes IN)
    switch (payment_method) {
      case 'cash':
        debitAccount = AccountCode.CASH_ON_HAND;
        break;
      case 'qris':
      case 'va':
      case 'transfer':
        debitAccount = AccountCode.BANK_BCA; // Default to BCA for now
        break;
      case 'savings_balance':
        debitAccount = AccountCode.SAVINGS_VOLUNTARY; // Liability decreases (Debit)
        break;
      default:
        debitAccount = AccountCode.CASH_ON_HAND;
    }

    // 2. Credit Side (Revenue or Liability Source)
    creditAccount = this.getRevenueAccount(transaction_type);

    // 3. Create Entry
    await this.ledgerService.recordTransaction({
      koperasi_id,
      tx_type: transaction_type === 'retail_sale' ? 'retail_sale' 
             : transaction_type === 'loan_payment' ? 'loan_repayment'
             : 'savings_deposit',
      tx_reference: reference_id,
      account_debit: debitAccount,
      account_credit: creditAccount,
      amount: amount,
      description: `Payment ${payment_method} for ${transaction_type}`,
      source_table: 'payment_transactions',
      source_id: transaction.id,
      created_by: created_by || '00000000-0000-0000-0000-000000000000' // Ensure string, fallback to nil UUID if undefined
    });
  }

  private getRevenueAccount(type: string): AccountCode {
    switch (type) {
      case 'retail_sale':
        return AccountCode.SALES_REVENUE;
      case 'loan_payment':
        return AccountCode.LOAN_RECEIVABLE_FLAT; // Simplifying: assume principal payment
      case 'savings_deposit':
        return AccountCode.SAVINGS_VOLUNTARY; // Liability Increases (Credit)
      default:
        throw new Error(`Unknown transaction type for revenue mapping: ${type}`);
    }
  }
}
