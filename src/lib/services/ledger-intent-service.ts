import { createClient } from '@/lib/supabase/server';
import { AccountingService, CreateJournalDTO, JournalLineDTO } from './accounting-service';
import { AccountCode, AccountingEventType } from '@/lib/types/ledger';

/**
 * LedgerIntentService
 * 
 * Purpose: 
 * - Sole authority for creating compliant ledger entries
 * - Enforces Debit = Credit
 * - Enforces Period Locking (Application Level Check)
 * - Returns validated Journal DTO for posting
 * 
 * Does NOT:
 * - Update business state (Savings Balance, Loan Status, etc.)
 * - Bypass RLS
 */
export const LedgerIntentService = {

  /**
   * Validate and Construct a Journal Entry DTO
   * This is the "Intent" phase.
   */
  async createIntent(
    koperasiId: string,
    eventType: AccountingEventType,
    description: string,
    lines: JournalLineDTO[],
    referenceId?: string,
    referenceType?: string,
    userId?: string
  ): Promise<CreateJournalDTO> {

    // 1. Validate Double Entry
    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(`Ledger Integrity Violation: Debit (${totalDebit}) != Credit (${totalCredit})`);
    }

    if (totalDebit <= 0) {
      throw new Error('Ledger Integrity Violation: Zero or negative transaction amount');
    }

    // 2. Validate Period (Pre-check)
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: period, error } = await supabase
      .from('accounting_period')
      .select('status')
      .eq('koperasi_id', koperasiId)
      .lte('start_date', today)
      .gte('end_date', today)
      .single();

    if (error || !period) {
      // If no period found, we might want to allow it depending on policy, 
      // but strict mode says NO.
      // However, for initialization, we might be lenient. 
      // Let's assume strict for now.
      console.warn('Warning: No active accounting period found for today. Transaction might fail at DB layer if strict.');
    } else if (period.status === 'closed') {
      throw new Error('Ledger Violation: Cannot create intent in a CLOSED accounting period.');
    }

    // 3. Construct DTO
    return {
      koperasi_id: koperasiId,
      business_unit: this.mapEventToUnit(eventType),
      transaction_date: today,
      description: description,
      reference_id: referenceId,
      reference_type: referenceType,
      lines: lines,
      created_by: userId
    };
  },

  mapEventToUnit(type: AccountingEventType): string {
    switch (type) {
      case 'SAVINGS_DEPOSIT':
      case 'SAVINGS_WITHDRAWAL':
        return 'simpan_pinjam';
      case 'LOAN_DISBURSEMENT':
      case 'LOAN_REPAYMENT':
      case 'FINANCING_DISBURSEMENT':
      case 'FINANCING_REPAYMENT':
        return 'simpan_pinjam';
      case 'RETAIL_SALE':
      case 'RETAIL_PURCHASE':
      case 'RETAIL_PURCHASE_RETURN':
      case 'RETAIL_SALES_RETURN':
        return 'retail';
      case 'PAYMENT_RECEIPT':
        return 'payment_gateway';
      default:
        return 'general';
    }
  },

  // --- Domain Specific Intent Builders ---

  async prepareStockOpnameAdjustment(
    koperasiId: string,
    referenceId: string, // invoice number or opname id
    opnameId: string,
    adjustmentAmount: number, // signed: >0 gain, <0 loss
    userId: string
  ): Promise<CreateJournalDTO> {
    const inventoryAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.INVENTORY_MERCHANDISE);
    const adjAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.INVENTORY_ADJUSTMENT);

    if (!inventoryAccId || !adjAccId) throw new Error('GL Account Configuration Missing for Stock Opname');

    const isGain = adjustmentAmount > 0;
    const absAmount = Math.abs(adjustmentAmount);

    const lines: JournalLineDTO[] = [
      {
        account_id: isGain ? inventoryAccId : adjAccId,
        debit: absAmount,
        credit: 0,
        description: isGain ? `Surplus Stok - ${referenceId}` : `Defisit Stok - ${referenceId}`
      },
      {
        account_id: isGain ? adjAccId : inventoryAccId,
        debit: 0,
        credit: absAmount,
        description: isGain ? `Pendapatan Opname - ${referenceId}` : `Beban Opname - ${referenceId}`
      }
    ];

    return this.createIntent(
      koperasiId,
      'JOURNAL_ADJUSTMENT',
      `Stock Opname Adjustment ${referenceId}`,
      lines,
      opnameId,
      'STOCK_OPNAME_ADJUSTMENT',
      userId
    );
  },

  async preparePaymentReceipt(
    koperasiId: string,
    amount: number,
    paymentMethod: string, // 'cash', 'qris', 'transfer', 'savings_balance'
    transactionType: string, // 'retail_sale', 'loan_payment', 'rental_payment', etc.
    referenceId: string,
    userId: string
  ): Promise<CreateJournalDTO> {
    // 1. Determine Debit Account (Where money enters)
    let debitAccCode = AccountCode.CASH_ON_HAND;
    if (paymentMethod === 'qris' || paymentMethod === 'transfer' || paymentMethod === 'va') {
      debitAccCode = AccountCode.BANK_BCA; // Default bank
    } else if (paymentMethod === 'savings_balance') {
      debitAccCode = AccountCode.SAVINGS_VOLUNTARY; // Liability decreases
    }

    // 2. Determine Credit Account (Source/Revenue)
    let creditAccCode = AccountCode.OTHER_INCOME;
    switch (transactionType) {
      case 'retail_sale':
        // Payment for Retail Invoice -> Credit AR
        creditAccCode = AccountCode.ACCOUNTS_RECEIVABLE;
        break;
      case 'loan_payment':
        // Payment for Loan -> Credit Loan Receivable
        creditAccCode = AccountCode.LOAN_RECEIVABLE_FLAT;
        break;
      case 'savings_deposit':
        // Deposit -> Credit Savings Liability
        creditAccCode = AccountCode.SAVINGS_VOLUNTARY;
        break;
      case 'rental_payment':
        // Rental -> Credit Rental Revenue
        creditAccCode = AccountCode.RENTAL_REVENUE;
        break;
      default:
        creditAccCode = AccountCode.OTHER_INCOME;
    }

    const debitAccId = await AccountingService.getAccountIdByCode(koperasiId, debitAccCode);
    const creditAccId = await AccountingService.getAccountIdByCode(koperasiId, creditAccCode);

    if (!debitAccId || !creditAccId) {
      throw new Error(`GL Account Configuration Missing for Payment Receipt (${debitAccCode} / ${creditAccCode})`);
    }

    const lines: JournalLineDTO[] = [
      { account_id: debitAccId, debit: amount, credit: 0, description: `Penerimaan ${paymentMethod} (${transactionType})` },
      { account_id: creditAccId, debit: 0, credit: amount, description: `Pelunasan/Pendapatan - ${referenceId}` }
    ];

    return this.createIntent(
      koperasiId,
      'PAYMENT_RECEIPT',
      `Penerimaan Pembayaran ${transactionType} - ${referenceId}`,
      lines,
      referenceId,
      'PAYMENT_TRANSACTION',
      userId
    );
  },

  async prepareRetailPurchase(
    koperasiId: string,
    invoiceNumber: string,
    totalAmount: number,
    taxAmount: number,
    paymentStatus: 'paid' | 'debt',
    userId: string
  ): Promise<CreateJournalDTO> {
    const netAmount = totalAmount - taxAmount;

    const inventoryAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.INVENTORY_MERCHANDISE);
    const paymentAccId = await AccountingService.getAccountIdByCode(
      koperasiId,
      paymentStatus === 'paid' ? AccountCode.CASH_ON_HAND : AccountCode.ACCOUNTS_PAYABLE
    );

    if (!inventoryAccId || !paymentAccId) throw new Error('GL Account Configuration Missing for Retail Purchase');

    const lines: JournalLineDTO[] = [
      { account_id: inventoryAccId, debit: netAmount, credit: 0, description: `Persediaan - ${invoiceNumber}` }
    ];

    if (taxAmount > 0) {
      const vatInAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.VAT_IN);
      if (vatInAccId) {
        lines.push({ account_id: vatInAccId, debit: taxAmount, credit: 0, description: `PPN Masukan - ${invoiceNumber}` });
      } else {
        // Fallback or Error? 
        throw new Error('GL Account Configuration Missing for VAT IN');
      }
    }

    lines.push({
      account_id: paymentAccId,
      debit: 0,
      credit: totalAmount,
      description: paymentStatus === 'paid' ? `Pembelian Tunai - ${invoiceNumber}` : `Hutang Dagang - ${invoiceNumber}`
    });

    return this.createIntent(
      koperasiId,
      'RETAIL_PURCHASE',
      `Pembelian Stok ${invoiceNumber}`,
      lines,
      invoiceNumber,
      'RETAIL_PURCHASE',
      userId
    );
  },

  async prepareRetailPurchaseReturn(
    koperasiId: string,
    returnNumber: string,
    refundAmount: number,
    userId: string
  ): Promise<CreateJournalDTO> {
    const cashAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.CASH_ON_HAND);
    const inventoryAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.INVENTORY_MERCHANDISE);

    if (!cashAccId || !inventoryAccId) throw new Error('GL Account Configuration Missing for Purchase Return');

    const lines: JournalLineDTO[] = [
      { account_id: cashAccId, debit: refundAmount, credit: 0, description: `Refund Retur - ${returnNumber}` },
      { account_id: inventoryAccId, debit: 0, credit: refundAmount, description: `Retur Persediaan - ${returnNumber}` }
    ];

    return this.createIntent(
      koperasiId,
      'RETAIL_PURCHASE_RETURN',
      `Retur Pembelian ${returnNumber}`,
      lines,
      returnNumber,
      'RETAIL_PURCHASE_RETURN',
      userId
    );
  },

  async prepareRetailSales(
    koperasiId: string,
    invoiceNumber: string,
    totalAmount: number,
    taxAmount: number,
    cogsAmount: number, // Total COGS (Regular + Consignment)
    inventoryCreditAmount: number, // Portion crediting Inventory
    consignmentCreditAmount: number, // Portion crediting Consignment Payable
    payments: { method: string; amount: number }[],
    userId: string
  ): Promise<CreateJournalDTO> {
    const lines: JournalLineDTO[] = [];

    // 1. Revenue Side (Debits - Payments)
    for (const payment of payments) {
      let accCode = AccountCode.CASH_ON_HAND;
      if (payment.method === 'qris' || payment.method === 'transfer') accCode = AccountCode.BANK_BCA;
      else if (payment.method === 'savings_balance') accCode = AccountCode.SAVINGS_VOLUNTARY;

      const accId = await AccountingService.getAccountIdByCode(koperasiId, accCode);
      if (!accId) throw new Error(`GL Account missing for payment method ${payment.method}`);

      lines.push({
        account_id: accId,
        debit: payment.amount,
        credit: 0,
        description: `Pembayaran ${payment.method} - ${invoiceNumber}`
      });
    }

    // 2. Revenue Side (Credit - Revenue Net & Tax)
    const revenueAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.SALES_REVENUE);
    if (!revenueAccId) throw new Error('GL Account missing for Revenue');

    const netRevenue = totalAmount - taxAmount;

    lines.push({
      account_id: revenueAccId,
      debit: 0,
      credit: netRevenue,
      description: `Pendapatan Penjualan - ${invoiceNumber}`
    });

    if (taxAmount > 0) {
      const vatOutAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.VAT_OUT);
      if (!vatOutAccId) throw new Error('GL Account missing for VAT Out');

      lines.push({
        account_id: vatOutAccId,
        debit: 0,
        credit: taxAmount,
        description: `PPN Keluaran - ${invoiceNumber}`
      });
    }

    // 3. COGS Side (Debit COGS)
    const cogsAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.COGS);
    if (!cogsAccId) throw new Error('GL Account missing for COGS');

    if (cogsAmount > 0) {
      lines.push({ account_id: cogsAccId, debit: cogsAmount, credit: 0, description: `HPP - ${invoiceNumber}` });
    }

    // 4. Inventory Credit Side
    if (inventoryCreditAmount > 0) {
      const inventoryAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.INVENTORY_MERCHANDISE);
      if (!inventoryAccId) throw new Error('GL Account missing for Inventory');
      lines.push({ account_id: inventoryAccId, debit: 0, credit: inventoryCreditAmount, description: `Persediaan Terjual - ${invoiceNumber}` });
    }

    // 5. Consignment Credit Side
    if (consignmentCreditAmount > 0) {
      const consignmentAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.CONSIGNMENT_PAYABLE);
      if (!consignmentAccId) throw new Error('GL Account missing for Consignment Payable');
      lines.push({ account_id: consignmentAccId, debit: 0, credit: consignmentCreditAmount, description: `Hutang Konsinyasi - ${invoiceNumber}` });
    }

    return this.createIntent(
      koperasiId,
      'RETAIL_SALE',
      `Penjualan Retail ${invoiceNumber}`,
      lines,
      invoiceNumber,
      'RETAIL_SALE',
      userId
    );
  },

  async prepareRetailSalesReturn(
    koperasiId: string,
    returnNumber: string,
    refundAmount: number,
    cogsReversalAmount: number,
    userId: string
  ): Promise<CreateJournalDTO> {
    const revenueAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.SALES_REVENUE);
    const cashAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.CASH_ON_HAND);

    if (!revenueAccId || !cashAccId) throw new Error('GL Account Configuration Missing for Sales Return (Revenue/Cash)');

    const lines: JournalLineDTO[] = [
      { account_id: revenueAccId, debit: refundAmount, credit: 0, description: `Retur Penjualan - ${returnNumber}` },
      { account_id: cashAccId, debit: 0, credit: refundAmount, description: `Refund Tunai - ${returnNumber}` }
    ];

    if (cogsReversalAmount > 0) {
      const inventoryAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.INVENTORY_MERCHANDISE);
      const cogsAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.COGS);

      if (!inventoryAccId || !cogsAccId) throw new Error('GL Account Configuration Missing for Sales Return (Inventory/COGS)');

      lines.push(
        { account_id: inventoryAccId, debit: cogsReversalAmount, credit: 0, description: `Restock Retur - ${returnNumber}` },
        { account_id: cogsAccId, debit: 0, credit: cogsReversalAmount, description: `Reversal HPP - ${returnNumber}` }
      );
    }

    return this.createIntent(
      koperasiId,
      'RETAIL_SALES_RETURN',
      `Retur Penjualan ${returnNumber}`,
      lines,
      returnNumber,
      'RETAIL_SALES_RETURN',
      userId
    );
  },

  async prepareSavingsDeposit(
    koperasiId: string,
    amount: number,
    memberId: string,
    savingsAccountId: string,
    paymentMethod: 'CASH' | 'TRANSFER',
    userId: string
  ): Promise<CreateJournalDTO> {
    const cashAccountCode = paymentMethod === 'CASH' ? AccountCode.CASH_ON_HAND : AccountCode.BANK_BCA; // Default to BCA for transfer, should be dynamic

    // In a real app, we fetch the specific product's GL account mapping.
    // For now, use standard mappings.
    const savingsLiabilityAccount = AccountCode.SAVINGS_VOLUNTARY; // Default fallback

    // Get Account IDs
    const debitAccId = await AccountingService.getAccountIdByCode(koperasiId, cashAccountCode);
    const creditAccId = await AccountingService.getAccountIdByCode(koperasiId, savingsLiabilityAccount);

    if (!debitAccId || !creditAccId) throw new Error('GL Account Configuration Missing');

    const lines: JournalLineDTO[] = [
      { account_id: debitAccId, debit: amount, credit: 0, description: 'Setoran Simpanan' },
      { account_id: creditAccId, debit: 0, credit: amount, description: 'Kredit Simpanan Anggota' }
    ];

    return this.createIntent(
      koperasiId,
      'SAVINGS_DEPOSIT',
      `Setoran Simpanan - ${memberId}`,
      lines,
      savingsAccountId,
      'savings_account',
      userId
    );
  },

  async prepareSavingsWithdrawal(
    koperasiId: string,
    amount: number,
    memberId: string,
    savingsAccountId: string,
    userId: string
  ): Promise<CreateJournalDTO> {
    const cashAccountCode = AccountCode.CASH_ON_HAND;
    const savingsLiabilityAccount = AccountCode.SAVINGS_VOLUNTARY;

    const debitAccId = await AccountingService.getAccountIdByCode(koperasiId, savingsLiabilityAccount);
    const creditAccId = await AccountingService.getAccountIdByCode(koperasiId, cashAccountCode);

    if (!debitAccId || !creditAccId) throw new Error('GL Account Configuration Missing');

    const lines: JournalLineDTO[] = [
      { account_id: debitAccId, debit: amount, credit: 0, description: 'Debit Simpanan Anggota' },
      { account_id: creditAccId, debit: 0, credit: amount, description: 'Penarikan Tunai' }
    ];

    return this.createIntent(
      koperasiId,
      'SAVINGS_WITHDRAWAL',
      `Penarikan Simpanan - ${memberId}`,
      lines,
      savingsAccountId,
      'savings_account',
      userId
    );
  },

  async prepareLoanDisbursement(
    koperasiId: string,
    amount: number,
    memberId: string,
    loanCode: string,
    userId: string
  ): Promise<CreateJournalDTO> {
    const debitAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.LOAN_RECEIVABLE_FLAT);
    const creditAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.CASH_ON_HAND);

    if (!debitAccId || !creditAccId) throw new Error('GL Account Configuration Missing for Loan Disbursement');

    const lines: JournalLineDTO[] = [
      { account_id: debitAccId, debit: amount, credit: 0, description: 'Piutang Pinjaman' },
      { account_id: creditAccId, debit: 0, credit: amount, description: 'Pencairan ke Kas' }
    ];

    return this.createIntent(
      koperasiId,
      'LOAN_DISBURSEMENT',
      `Pencairan Pinjaman #${loanCode} (${memberId})`,
      lines,
      loanCode,
      'loan_disbursement',
      userId
    );
  }

};
