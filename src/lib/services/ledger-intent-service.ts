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
  // Hook for testing
  _getClient: async () => createClient(),

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
    const supabase = await this._getClient();
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

  // --- Savings Domain Helpers ---
  
  async prepareSavingsDeposit(
    koperasiId: string,
    transactionId: string,
    amount: number,
    method: 'cash' | 'transfer',
    memberId: string,
    savingsAccountId: string,
    userId: string
  ): Promise<CreateJournalDTO> {
    const savingsLiabilityAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.SAVINGS_VOLUNTARY);
    const assetAccId = await AccountingService.getAccountIdByCode(
      koperasiId, 
      method === 'cash' ? AccountCode.CASH_ON_HAND : AccountCode.BANK_BCA
    );

    if (!savingsLiabilityAccId || !assetAccId) throw new Error('GL Account Configuration Missing for Savings Deposit');

    const lines: JournalLineDTO[] = [
      { 
        account_id: assetAccId, 
        debit: amount, 
        credit: 0, 
        description: `Setoran Simpanan (${method}) - ${transactionId}` 
      },
      { 
        account_id: savingsLiabilityAccId, 
        debit: 0, 
        credit: amount, 
        description: `Kredit Simpanan - ${transactionId}`,
        entity_id: savingsAccountId,
        entity_type: 'savings_account'
      }
    ];

    return this.createIntent(
      koperasiId,
      'SAVINGS_DEPOSIT',
      `Setoran Simpanan ${transactionId}`,
      lines,
      transactionId,
      'SAVINGS_TRANSACTION',
      userId
    );
  },

  async prepareSavingsWithdrawal(
    koperasiId: string,
    transactionId: string,
    amount: number,
    method: 'cash' | 'transfer',
    memberId: string,
    savingsAccountId: string,
    userId: string
  ): Promise<CreateJournalDTO> {
    const savingsLiabilityAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.SAVINGS_VOLUNTARY);
    const assetAccId = await AccountingService.getAccountIdByCode(
      koperasiId, 
      method === 'cash' ? AccountCode.CASH_ON_HAND : AccountCode.BANK_BCA
    );

    if (!savingsLiabilityAccId || !assetAccId) throw new Error('GL Account Configuration Missing for Savings Withdrawal');

    const lines: JournalLineDTO[] = [
      { 
        account_id: savingsLiabilityAccId, 
        debit: amount, 
        credit: 0, 
        description: `Debit Simpanan - ${transactionId}`,
        entity_id: savingsAccountId,
        entity_type: 'savings_account'
      },
      { 
        account_id: assetAccId, 
        debit: 0, 
        credit: amount, 
        description: `Penarikan Simpanan (${method}) - ${transactionId}` 
      }
    ];

    return this.createIntent(
      koperasiId,
      'SAVINGS_WITHDRAWAL',
      `Penarikan Simpanan ${transactionId}`,
      lines,
      transactionId,
      'SAVINGS_TRANSACTION',
      userId
    );
  },

  // STAGE 3: Marketplace Escrow Lock
  async prepareMarketplaceLock(
    koperasiId: string,
    transactionType: 'retail' | 'ppob',
    referenceId: string, // invoice number or trx id
    totalAmount: number,
    payments: { method: string; amount: number; account_id?: string }[], 
    userId: string
  ): Promise<CreateJournalDTO> {
    const lines: JournalLineDTO[] = [];
    const escrowAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.ESCROW_LIABILITY);
    
    if (!escrowAccId) throw new Error('GL Account Configuration Missing: Escrow Liability (2-1300)');

    // 1. Debit Side (Source of Funds)
    for (const payment of payments) {
        let accCode = AccountCode.CASH_ON_HAND;
        if (payment.method === 'qris' || payment.method === 'transfer' || payment.method === 'va') {
            accCode = AccountCode.BANK_BCA; 
        } else if (payment.method === 'savings_balance') {
            accCode = AccountCode.SAVINGS_VOLUNTARY;
        }

        const debitAccId = await AccountingService.getAccountIdByCode(koperasiId, accCode);
        if (!debitAccId) throw new Error(`GL Account Missing for Payment Method: ${payment.method}`);

        lines.push({
            account_id: debitAccId,
            debit: payment.amount,
            credit: 0,
            description: `Payment (${payment.method}) - ${referenceId}`,
            entity_id: payment.account_id,
            entity_type: payment.method === 'savings_balance' ? 'savings_account' : undefined
        });
    }

    // 2. Credit Side (Escrow Liability)
    lines.push({
        account_id: escrowAccId,
        debit: 0,
        credit: totalAmount,
        description: `Escrow Lock - ${referenceId}`
    });

    return this.createIntent(
        koperasiId,
        transactionType === 'retail' ? 'RETAIL_SALE' : 'PAYMENT_RECEIPT', 
        `Marketplace Lock (${transactionType}) - ${referenceId}`,
        lines,
        referenceId,
        'MARKETPLACE_LOCK',
        userId
    );
  },

  // STAGE 3: Retail Settlement Lines Helper
  async prepareRetailSettlementLines(
    koperasiId: string,
    invoiceNumber: string,
    finalAmount: number,
    taxAmount: number,
    cogsAmount: number,
    inventoryCreditAmount: number,
    consignmentCreditAmount: number
  ): Promise<JournalLineDTO[]> {
      const lines: JournalLineDTO[] = [];
      const revenueAmount = finalAmount - taxAmount;

      const revenueAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.SALES_REVENUE);
      const cogsAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.COGS);
      const inventoryAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.INVENTORY_MERCHANDISE);
      const consignmentAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.CONSIGNMENT_PAYABLE);

      if (!revenueAccId || !cogsAccId || !inventoryAccId) throw new Error('GL Config Missing for Retail Settlement');

      // Credit Revenue (Offsets Escrow Debit)
      lines.push({
          account_id: revenueAccId,
          debit: 0,
          credit: revenueAmount,
          description: `Sales Revenue - ${invoiceNumber}`
      });

      // Credit Tax (Offsets Escrow Debit)
      if (taxAmount > 0) {
          const vatOutAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.VAT_OUT);
          if (vatOutAccId) {
             lines.push({
                 account_id: vatOutAccId,
                 debit: 0,
                 credit: taxAmount,
                 description: `VAT Out - ${invoiceNumber}`
             });
          }
      }

      // COGS Journal (Debit COGS, Credit Inventory/Consignment)
      // These are strictly internal movements triggered by settlement/fulfillment recognition
      if (cogsAmount > 0) {
          lines.push({
              account_id: cogsAccId,
              debit: cogsAmount,
              credit: 0,
              description: `COGS - ${invoiceNumber}`
          });

          if (inventoryCreditAmount > 0) {
              lines.push({
                  account_id: inventoryAccId,
                  debit: 0,
                  credit: inventoryCreditAmount,
                  description: `Inventory Usage - ${invoiceNumber}`
              });
          }
          if (consignmentCreditAmount > 0 && consignmentAccId) {
               lines.push({
                  account_id: consignmentAccId,
                  debit: 0,
                  credit: consignmentCreditAmount,
                  description: `Consignment Payable - ${invoiceNumber}`
              });
          }
      }
      
      return lines;
  },

  // STAGE 3: PPOB Settlement Lines Helper
  async preparePpobSettlementLines(
    koperasiId: string,
    referenceId: string,
    totalPriceSell: number, // Customer paid this (Revenue)
    totalPriceBuy: number // We pay this (Expense/Deposit)
  ): Promise<JournalLineDTO[]> {
      const lines: JournalLineDTO[] = [];
      
      const revenueAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.PPOB_REVENUE);
      const expenseAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.INVENTORY_ADJUSTMENT); // Use specific expense? 5-1102?
      // Actually PPOB Buy Price is usually deducted from Deposit.
      // 5-1102 is INVENTORY_ADJUSTMENT.
      // Standard PPOB Cost: 5-xxxx?
      // Let's reuse what was in PpobService: 
      // Expense: 5-1102 (Inventory Adjustment? weird).
      // Let's use OPERATIONAL_EXPENSE (5-2001) or create PPOB_COST?
      // AccountCode doesn't have PPOB_COST.
      // But ledger.ts has 'ppob_cost' in LedgerTransaction type.
      // Let's use 5-2001 for now or check if there is a better one.
      // In the previous PPOB code, it used 5-1102. I will stick to it or better find COGS.
      // Actually, PPOB is a service.
      
      // Let's stick to what was there: 
      // Debit: 5-1102 (if buy > 0)
      // Credit: PPOB_DEPOSIT (1-1501)
      
      const costAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.INVENTORY_ADJUSTMENT); // as per previous code
      const depositAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.PPOB_DEPOSIT);

      if (!revenueAccId || !depositAccId) throw new Error('GL Config Missing for PPOB Settlement');

      // Credit Revenue (Offsets Escrow Debit)
      lines.push({
          account_id: revenueAccId,
          debit: 0,
          credit: totalPriceSell,
          description: `PPOB Revenue - ${referenceId}`
      });

      // Cost Recognition
      if (totalPriceBuy > 0 && costAccId) {
          lines.push({
              account_id: costAccId,
              debit: totalPriceBuy,
              credit: 0,
              description: `PPOB Cost - ${referenceId}`
          });
          lines.push({
              account_id: depositAccId,
              debit: 0,
              credit: totalPriceBuy,
              description: `PPOB Deposit Usage - ${referenceId}`
          });
      }

      return lines;
  },

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

  async prepareRetailSalesReturn(
    koperasiId: string,
    returnNumber: string,
    refundAmount: number,
    returnCOGS: number,
    userId: string
  ): Promise<CreateJournalDTO> {
    const revenueAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.SALES_REVENUE);
    const cashAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.CASH_ON_HAND);
    const cogsAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.COGS);
    const inventoryAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.INVENTORY_MERCHANDISE);

    if (!revenueAccId || !cashAccId || !cogsAccId || !inventoryAccId) {
        throw new Error('GL Account Configuration Missing for Sales Return');
    }

    const lines: JournalLineDTO[] = [
        // 1. Refund (Reduce Revenue, Reduce Cash)
        { account_id: revenueAccId, debit: refundAmount, credit: 0, description: `Retur Penjualan (Rev) - ${returnNumber}` },
        { account_id: cashAccId, debit: 0, credit: refundAmount, description: `Refund Retur - ${returnNumber}` }
    ];

    // 2. Stock Restoration (Reduce COGS, Increase Inventory)
    if (returnCOGS > 0) {
        lines.push(
            { account_id: inventoryAccId, debit: returnCOGS, credit: 0, description: `Restock Retur - ${returnNumber}` },
            { account_id: cogsAccId, debit: 0, credit: returnCOGS, description: `Koreksi HPP Retur - ${returnNumber}` }
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

  // Deprecated for Marketplace, use prepareMarketplaceLock + prepareRetailSettlementLines
  async prepareRetailSales(
    koperasiId: string,
    invoiceNumber: string,
    totalAmount: number,
    taxAmount: number,
    cogsAmount: number, // Total COGS (Regular + Consignment)
    inventoryCreditAmount: number, // Portion crediting Inventory
    consignmentCreditAmount: number, // Portion crediting Consignment Payable
    payments: { method: string; amount: number; account_id?: string }[],
    userId: string
  ): Promise<CreateJournalDTO> {
    const lines: JournalLineDTO[] = [];

    // 1. Revenue Side (Debits - Payments)
    for (const payment of payments) {
      let accCode = AccountCode.CASH_ON_HAND;
      if (payment.method === 'qris' || payment.method === 'transfer') {
        accCode = AccountCode.BANK_BCA; 
      } else if (payment.method === 'savings_balance') {
        accCode = AccountCode.SAVINGS_VOLUNTARY;
      }

      const debitAccId = await AccountingService.getAccountIdByCode(koperasiId, accCode);
      if (!debitAccId) throw new Error(`GL Account Missing for Payment Method: ${payment.method}`);

      lines.push({
        account_id: debitAccId,
        debit: payment.amount,
        credit: 0,
        description: `Pembayaran ${payment.method} - ${invoiceNumber}`,
        entity_id: payment.account_id,
        entity_type: payment.method === 'savings_balance' ? 'savings_account' : undefined
      });
    }

    // 2. Revenue Side (Credits - Sales & Tax)
    const revenueAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.SALES_REVENUE);
    if (!revenueAccId) throw new Error('GL Account Configuration Missing for Retail Sales');

    const revenueAmount = totalAmount - taxAmount;
    lines.push({
      account_id: revenueAccId,
      debit: 0,
      credit: revenueAmount,
      description: `Pendapatan Penjualan - ${invoiceNumber}`
    });

    if (taxAmount > 0) {
      const vatOutAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.VAT_OUT);
      if (vatOutAccId) {
        lines.push({ account_id: vatOutAccId, debit: 0, credit: taxAmount, description: `PPN Keluaran - ${invoiceNumber}` });
      }
    }

    // 3. COGS Side (Debit COGS, Credit Inventory/Consignment)
    if (cogsAmount > 0) {
      const cogsAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.COGS);
      const inventoryAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.INVENTORY_MERCHANDISE);
      const consignmentAccId = await AccountingService.getAccountIdByCode(koperasiId, AccountCode.CONSIGNMENT_PAYABLE);

      if (!cogsAccId || !inventoryAccId) throw new Error('GL Account Configuration Missing for COGS');

      lines.push({ account_id: cogsAccId, debit: cogsAmount, credit: 0, description: `HPP - ${invoiceNumber}` });

      if (inventoryCreditAmount > 0) {
        lines.push({ account_id: inventoryAccId, debit: 0, credit: inventoryCreditAmount, description: `Persediaan Keluar - ${invoiceNumber}` });
      }

      if (consignmentCreditAmount > 0) {
        if (!consignmentAccId) throw new Error('GL Account Configuration Missing for Consignment');
        lines.push({ account_id: consignmentAccId, debit: 0, credit: consignmentCreditAmount, description: `Hutang Konsinyasi - ${invoiceNumber}` });
      }
    }

    return this.createIntent(
      koperasiId,
      'RETAIL_SALE',
      `Penjualan Ritel ${invoiceNumber}`,
      lines,
      invoiceNumber,
      'RETAIL_SALE',
      userId
    );
  }
};
