import { SupabaseClient } from '@supabase/supabase-js';
import { RetailService, POSTransaction, POSTransactionItem, PaymentBreakdown } from './retail-service';
import { PpobService, PpobTransactionData } from './ppob-service';
import { AccountingService } from './accounting-service';
import { LedgerIntentService } from './ledger-intent-service';

import { LogService } from './log-service';

export type TransactionStatus = 'initiated' | 'journal_locked' | 'fulfilled' | 'settled' | 'reversed';

export interface MarketplaceTransaction {
  id: string;
  type: 'retail' | 'ppob';
  status: TransactionStatus;
  journal_id: string | null;
  entity_type: 'retail' | 'ppob';
  entity_id: string; // ID of the operational record (e.g. POS Transaction ID, PPOB Transaction ID) - might be empty initially
  amount: number;
  created_at: string;
  koperasi_id: string;
  created_by: string;
}

export class MarketplaceService {
  private retailService: RetailService;
  private ppobService: PpobService;
  private logService: LogService;

  constructor(private supabase: SupabaseClient) {
    this.retailService = new RetailService(supabase);
    this.ppobService = new PpobService(supabase);
    this.logService = new LogService(supabase);
  }

  // ==========================================
  // STATE MACHINE ORCHESTRATION (SOLE AUTHORITY)
  // ==========================================

  /**
   * Step 1: Create Transaction Record (INITIATED)
   * Tracks the lifecycle from the very beginning.
   */
  async createTransaction(
    koperasiId: string,
    type: 'retail' | 'ppob',
    amount: number,
    userId: string, idempotencyKey?: string): Promise<MarketplaceTransaction> { if (idempotencyKey) { const { data: existing } = await this.supabase.from('marketplace_transactions').select('*').eq('idempotency_key', idempotencyKey).maybeSingle(); if (existing) return existing; } const { data, error } = await this.supabase
      .from('marketplace_transactions')
      .insert({
        koperasi_id: koperasiId,
        type,
        status: 'initiated',
        entity_type: type,
        entity_id: 'pending', // Will be updated on fulfillment
        amount,
        created_by: userId,
        journal_id: null, idempotency_key: idempotencyKey })
      .select()
      .single();

    if (error) throw new Error(`Failed to init marketplace transaction: ${error.message}`);
    
    await this.logService.log({
      action_type: 'SYSTEM',
      action_detail: `Marketplace Transaction INITIATED: ${data.id}`,
      entity_id: data.id,
      user_id: userId,
      status: 'SUCCESS',
      metadata: { amount, type }
    });

    return data;
  }

  /**
   * Step 2: Lock Funds (JOURNAL_LOCKED)
   * Debits User Funds/Cash, Credits Escrow Liability.
   */
  async lockJournal(
    transactionId: string,
    referenceId: string, // Invoice number or similar
    paymentMethods: PaymentBreakdown[]
  ): Promise<MarketplaceTransaction> {
    // 1. Get Transaction
    const { data: trx, error: fetchError } = await this.supabase
      .from('marketplace_transactions')
      .select('*')
      .eq('id', transactionId)
      .single();
    
    if (fetchError || !trx) throw new Error('Transaction not found');
    if (trx.status !== 'initiated') throw new Error(`Invalid state transition: ${trx.status} -> journal_locked`);

    // 2. Prepare Ledger Intent (Escrow Lock)
    const journalDTO = await LedgerIntentService.prepareMarketplaceLock(
      trx.koperasi_id,
      trx.type,
      referenceId,
      trx.amount,
      paymentMethods,
      trx.created_by
    );
    
    const journalId = await AccountingService.postJournal(journalDTO, this.supabase);

    // 3. Update State
    const { data: updated, error: updateError } = await this.supabase
      .from('marketplace_transactions')
      .update({
        status: 'journal_locked',
        journal_id: journalId
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (updateError) throw new Error(`Failed to lock journal: ${updateError.message}`);
    return updated;
  }

  /**
   * Step 3: Fulfill (FULFILLED)
   * Calls Retail/PPOB Service to do the real work.
   */
  async markFulfilled(
    transactionId: string,
    operationalData: any
  ): Promise<MarketplaceTransaction> {
     // 1. Get Transaction
    const { data: trx } = await this.supabase.from('marketplace_transactions').select('*').eq('id', transactionId).single();
    if (!trx) throw new Error('Transaction not found');
    if (trx.status !== 'journal_locked') throw new Error(`Invalid state transition: ${trx.status} -> fulfilled`);

    // 2. Update State
    const { data: updated, error } = await this.supabase
      .from('marketplace_transactions')
      .update({
        status: 'fulfilled',
        fulfilled_at: new Date().toISOString(),
        entity_id: operationalData.id // Link to POS/PPOB Transaction ID
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw new Error(`Failed to mark fulfilled: ${error.message}`);
    return updated;
  }

  /**
   * Step 4: Settle (SETTLED)
   * Recognizes Revenue.
   */
  async settleTransaction(transactionId: string): Promise<MarketplaceTransaction> {
    const { data: trx } = await this.supabase.from('marketplace_transactions').select('*').eq('id', transactionId).single();
    if (!trx) throw new Error('Transaction not found');
    
    // Idempotency: If already settled, return success
    if (trx.status === 'settled') return trx;

    if (trx.status !== 'fulfilled') throw new Error(`Invalid state transition: ${trx.status} -> settled`);

    // 1. Prepare Settlement Lines based on type
    let settlementLines: any[] = [];
    
    if (trx.type === 'retail') {
       // We need details from the POS transaction to know COGS etc.
       const { data: posTrx } = await this.supabase.from('pos_transactions').select('*').eq('id', trx.entity_id).single();
       if (!posTrx) throw new Error('POS Transaction details not found');
       
       // We need to re-calculate or fetch the COGS/Tax details.
       // RetailService.getPurchaseById? No that's for PO.
       // We can fetch items.
       const { data: items } = await this.supabase.from('pos_transaction_items').select('*, product:inventory_products(*)').eq('transaction_id', posTrx.id);
       
       // Re-calculate totals for settlement
       // This is a bit redundant but safe. Or we could have stored them in metadata.
       
       // RE-READ: I need to get COGS.
       // I'll call RetailService.calculateSettlementData(posTrxId)
      const settlementData = await this.retailService.calculateSettlementData(posTrx.id);
      settlementLines = await LedgerIntentService.prepareRetailSettlementLines(
        trx.koperasi_id,
        posTrx.invoice_number,
        trx.amount,
        posTrx.tax_amount || 0,
        settlementData.totalCOGS,
        settlementData.inventoryCreditAmount,
        settlementData.consignmentCreditAmount
      );

    } else if (trx.type === 'ppob') {
      const { data: ppobTrx } = await this.supabase.from('ppob_transactions').select('*').eq('id', trx.entity_id).single();
      if (!ppobTrx) throw new Error('PPOB Transaction details not found');
      
      // Metadata usually has base_price
      const basePrice = ppobTrx.metadata?.base_price || 0;
      
      settlementLines = await LedgerIntentService.preparePpobSettlementLines(
        trx.koperasi_id,
        ppobTrx.customer_number,
        trx.amount, // Sell Price
        basePrice
      );
    }

    if (!trx.journal_id) throw new Error('Journal ID is missing for settlement');

    // 2. Call Accounting Service
    await AccountingService.settleEscrow(trx.journal_id, settlementLines, this.supabase);

    // 3. Update State
    const { data: updated, error } = await this.supabase
      .from('marketplace_transactions')
      .update({
        status: 'settled',
        settled_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw new Error(`Failed to settle: ${error.message}`);
    return updated;
  }

  /**
   * Reverse (REVERSED)
   * Refunds user.
   */
  async reverseTransaction(transactionId: string, reason: string): Promise<MarketplaceTransaction> {
    const { data: trx } = await this.supabase.from('marketplace_transactions').select('*').eq('id', transactionId).single();
    if (!trx) throw new Error('Transaction not found');
    if (trx.status === 'reversed') return trx; // Idempotent
    // Can reverse from journal_locked or fulfilled (if settlement failed)
    if (!['journal_locked', 'fulfilled'].includes(trx.status)) {
       throw new Error(`Cannot reverse from state: ${trx.status}`);
    }

    if (!trx.journal_id) throw new Error('Journal ID is missing for reversal');

    // 1. Reverse Ledger
    await AccountingService.reverseEscrow(trx.journal_id, reason, this.supabase);

    // 2. Update State
    const { data: updated, error } = await this.supabase
      .from('marketplace_transactions')
      .update({
        status: 'reversed',
        reversed_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) throw new Error(`Failed to reverse: ${error.message}`);

    await this.logService.log({
      action_type: 'SYSTEM',
      action_detail: `Marketplace Transaction REVERSED: ${updated.id}`,
      entity_id: updated.id,
      user_id: updated.created_by,
      status: 'WARNING',
      metadata: { reason }
    });

    return updated;
  }

  // ==========================================
  // MONITORING & RECOVERY
  // ==========================================

  /**
   * List stuck transactions
   * Returns transactions stuck in 'journal_locked' or 'fulfilled' for more than X minutes.
   */
  async listStuckTransactions(minutes: number = 30) {
    const threshold = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    
    const { data, error } = await this.supabase
      .from('marketplace_transactions')
      .select('*')
      .in('status', ['journal_locked', 'fulfilled']) 
      .lt('created_at', threshold)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as MarketplaceTransaction[];
  }

  /**
   * Reconcile Stuck Transactions (Recovery)
   * Auto-reverses transactions that are stuck in 'journal_locked' (money taken, no goods given).
   */
  async reconcileStuckTransactions(minutes: number = 30) {
    const stuck = await this.listStuckTransactions(minutes);
    const results: any[] = [];

    for (const trx of stuck) {
      try {
        // Case 1: Stuck in Journal Locked (Money Locked, Operational Pending)
        // If entity_id is 'pending', it means operational fulfillment never happened.
        // SAFE TO REVERSE.
        if (trx.status === 'journal_locked' && trx.entity_id === 'pending') {
          await this.reverseTransaction(trx.id, 'System Recovery: Stuck in journal_locked');
          results.push({ id: trx.id, status: 'recovered_reversed', reason: 'Stuck in lock' });
        }
        // Case 2: Stuck in Fulfilled (Goods Given, Revenue Not Recognized)
        // Needs Settlement.
        else if (trx.status === 'fulfilled') {
          await this.settleTransaction(trx.id);
          results.push({ id: trx.id, status: 'recovered_settled', reason: 'Stuck in fulfilled' });
        }
      } catch (error: any) {
        results.push({ id: trx.id, status: 'failed', error: error.message });
      }
    }
    return results;
  }

  // ==========================================
  // HIGH LEVEL FLOWS
  // ==========================================

  async checkoutRetail(
    koperasiId: string,
    userId: string,
    transactionData: Partial<POSTransaction>,
    items: Partial<POSTransactionItem>[],
    payments: PaymentBreakdown[],
    idempotencyKey?: string
  ) {
    // 1. Prepare & Calculate (Retail Service)
    const prepared = await this.retailService.prepareTransactionData(transactionData, items, payments);
    
    // 2. Create Transaction (Initiated)
    let trx = await this.createTransaction(koperasiId, 'retail', prepared.finalAmount, userId, idempotencyKey);

    // If we got an existing transaction (Idempotency), we need to check its state
    if (idempotencyKey && trx.status === 'settled') {
       const operational = trx.entity_id && trx.entity_id !== 'pending' 
         ? await this.retailService.getPosTransactionById(trx.entity_id)
         : { id: trx.entity_id };
       return { success: true, transaction: trx, operational };
    }
    
    let operationalResult = null;

    try {
      // 3. Lock Journal (Journal Locked)
      if (trx.status === 'initiated') {
          trx = await this.lockJournal(trx.id, prepared.invoiceNumber, payments);
      }

      if (!trx.journal_id) throw new Error('Journal ID missing after lock');

      // 4. Fulfill (Fulfilled)
      if (trx.status === 'journal_locked') {
          operationalResult = await this.retailService.fulfillTransaction(
             trx.journal_id, 
             { ...transactionData, invoice_number: prepared.invoiceNumber, final_amount: prepared.finalAmount },
             items,
             payments
          );
          
          trx = await this.markFulfilled(trx.id, operationalResult);
      }

      // 5. Settle (Settled)
      if (trx.status === 'fulfilled') {
          trx = await this.settleTransaction(trx.id);
      }
      
      if (!operationalResult && trx.entity_id && trx.entity_id !== 'pending') {
          operationalResult = await this.retailService.getPosTransactionById(trx.entity_id);
      }
      
      return { success: true, transaction: trx, operational: operationalResult || { id: trx.entity_id } };

    } catch (error: any) {
      console.error('Checkout Failed, attempting Reversal:', error);
      if (trx.status === 'journal_locked' || trx.status === 'fulfilled') {
        await this.reverseTransaction(trx.id, 'System Failure: ' + error.message);
      }
      throw error;
    }
  }

  async checkoutPpob(
    koperasiId: string,
    userId: string,
    ppobData: PpobTransactionData,
    idempotencyKey?: string
  ) {
    // 1. Validate (Ppob Service)
    const { product, totalCost } = await this.ppobService.validateForMarketplace(ppobData);

    // 2. Create Transaction (Initiated)
    let trx = await this.createTransaction(koperasiId, 'ppob', totalCost, userId, idempotencyKey);
    
    // Idempotency Check
    if (idempotencyKey && trx.status === 'settled') {
        return { success: true, transaction: trx, operational: { id: trx.entity_id } };
    }

    try {
      // 3. Lock Journal
      if (trx.status === 'initiated') {
          const payments: PaymentBreakdown[] = [{ method: 'savings_balance', amount: totalCost, account_id: ppobData.account_id }];
          trx = await this.lockJournal(trx.id, `PPOB-${ppobData.customer_number}`, payments);
      }

      if (!trx.journal_id) throw new Error('Journal ID missing after lock');

      // 4. Fulfill
      if (trx.status === 'journal_locked') {
          const operationalResult = await this.ppobService.fulfillMarketplace(ppobData, product, trx.journal_id);
          trx = await this.markFulfilled(trx.id, operationalResult.transaction);
      }

      // 5. Settle
      if (trx.status === 'fulfilled') {
          trx = await this.settleTransaction(trx.id);
      }

      return { success: true, transaction: trx, operational: { id: trx.entity_id } };

    } catch (error: any) {
       console.error('PPOB Checkout Failed, attempting Reversal:', error);
       if (trx.status === 'journal_locked' || trx.status === 'fulfilled') {
         await this.reverseTransaction(trx.id, `System Failure: ${error.message}`);
       }
       throw error;
    }
  }

  /**
   * Process Sales Return (Orchestration)
   */
  async processSalesReturn(
    koperasiId: string,
    userId: string,
    returnHeader: any, 
    items: any[]
  ) {
    let journalId: string | null = null;

    // 1. Ledger Gatekeeper (Ledger-First)
    if (returnHeader.status === 'completed') {
       // Calculate COGS using RetailService helper
       const totalReturnCOGS = await this.retailService.calculateReturnCOGS(items);
       
       try {
           const journalDTO = await LedgerIntentService.prepareRetailSalesReturn(
              koperasiId,
              returnHeader.return_number,
              returnHeader.total_refund_amount,
              totalReturnCOGS,
              userId
           );
           journalId = await AccountingService.postJournal(journalDTO, this.supabase);
       } catch (error: any) {
           throw new Error(`Retur Penjualan Ditolak oleh Sistem Akuntansi: ${error.message}`);
       }
    }

    // 2. Create Operational Record
    try {
        const result = await this.retailService.createSalesReturnRecord(
            { ...returnHeader, created_by: userId },
            items
        );
        return result;
    } catch (error: any) {
        if (journalId) {
             // If operational failed, reverse the journal (or void it)
             // Using voidJournal directly via AccountingService as it's a direct void of a just-created journal
             await AccountingService.voidJournal(journalId, `Sales Return Failed: ${error.message}`, this.supabase);
        }
        throw error;
    }
  }

  /**
   * List Stuck Transactions
   * Returns transactions stuck in journal_locked or fulfilled > X minutes
   */
  async getStuckTransactions(minutes: number) {
       const thresholdTime = new Date(Date.now() - minutes * 60000).toISOString();
       
       const { data: stuck, error: stuckError } = await this.supabase
         .from('marketplace_transactions')
         .select('*')
         .or(`and(status.eq.journal_locked,created_at.lt.${thresholdTime}),and(status.eq.fulfilled,fulfilled_at.lt.${thresholdTime})`);
         
       if (stuckError) throw stuckError;
       return stuck;
   }

   /**
    * Process Purchase Return (Orchestration)
    */
   async processPurchaseReturn(
      koperasiId: string,
      userId: string,
      returnHeader: any,
      items: any[]
    ) {
      let journalId: string | null = null;
      
      // 1. Ledger Gatekeeper
      if (returnHeader.status === 'completed') {
         try {
           const journalDTO = await LedgerIntentService.prepareRetailPurchaseReturn(
             koperasiId,
             returnHeader.return_number,
             returnHeader.total_refund_amount,
             userId
           );
           journalId = await AccountingService.postJournal(journalDTO, this.supabase);
         } catch (error: any) {
           throw new Error(`Retur Ditolak oleh Sistem Akuntansi: ${error.message}`);
         }
      }
  
      // 2. Operational
      try {
          const result = await this.retailService.createPurchaseReturnRecord(
              { ...returnHeader, created_by: userId },
              items
          );
          return result;
      } catch (error: any) {
          if (journalId) {
               await AccountingService.voidJournal(journalId, `Purchase Return Failed: ${error.message}`, this.supabase);
          }
          throw error;
      }
    }

   /**
    * Process Purchase (Orchestration)
    */
   async processPurchase(
     purchase: {
       koperasi_id: string;
       unit_usaha_id: string;
       supplier_id: string;
       invoice_number: string;
       total_amount: number;
       tax_amount?: number;
       payment_status: 'paid' | 'debt';
       notes?: string;
       created_by: string;
       po_id?: string;
     },
     items: {
       product_id: string;
       quantity: number;
       cost_per_item: number;
       subtotal: number;
     }[]
   ) {
     const tax = purchase.tax_amount || 0;
     let journalId: string | null = null;

     // 1. Ledger Gatekeeper
     try {
       const journalDTO = await LedgerIntentService.prepareRetailPurchase(
         purchase.koperasi_id,
         purchase.invoice_number,
         purchase.total_amount,
         tax,
         purchase.payment_status,
         purchase.created_by
       );
       journalId = await AccountingService.postJournal(journalDTO, this.supabase);
     } catch (error: any) {
       console.error("Ledger Gatekeeper Failed:", error);
       throw new Error(`Pembelian Ditolak oleh Sistem Akuntansi: ${error.message}`);
     }

     // 2. Operational
     try {
       const result = await this.retailService.createPurchaseRecord(purchase, items);
       return result;
     } catch (error: any) {
       if (journalId) {
         await AccountingService.voidJournal(journalId, `Purchase Failed: ${error.message}`, this.supabase);
       }
       throw error;
     }
   }

   /**
    * Process Stock Opname (Orchestration)
    */
   async processStockOpname(
    opname: {
      koperasi_id: string;
      unit_usaha_id?: string;
      notes?: string;
      status: 'draft' | 'final';
      created_by: string;
    },
    items: {
      product_id: string;
      system_qty: number;
      actual_qty: number;
      notes?: string;
    }[]
  ) {
    // 1. Create Operational Record (Force status=DRAFT initially for safety)
    const opnameRecord = await this.retailService.createStockOpnameRecord(
        { ...opname, status: 'draft' }, 
        items
    );

    // 2. If User requested FINAL
    if (opname.status === 'final') {
        let journalId: string | null = null;
        try {
            // A. Calculate Variance
            const varianceValue = await this.retailService.calculateOpnameVariance(opname.koperasi_id, items);

            // B. Post Journal
            if (varianceValue !== 0) {
                const journalDTO = await LedgerIntentService.prepareStockOpnameAdjustment(
                    opname.koperasi_id,
                    opnameRecord.invoice_number || opnameRecord.id,
                    opnameRecord.id,
                    varianceValue,
                    opname.created_by
                );
                journalId = await AccountingService.postJournal(journalDTO, this.supabase);
            }

            // C. Apply Stock Adjustments (Operational State Change)
            await this.retailService.applyOpnameStockUpdate(opnameRecord.id, items);

            // D. Update Opname Status to FINAL
            await this.supabase.from('inventory_stock_opname').update({
                status: 'final'
            }).eq('id', opnameRecord.id);
            
            return { ...opnameRecord, status: 'final' };

        } catch (error: any) {
            // If failed, Opname remains DRAFT.
            // If Journal was posted, we void it.
            if (journalId) {
                await AccountingService.voidJournal(journalId, `Stock Opname Failed: ${error.message}`, this.supabase);
            }
            throw error;
        }
    }

    return opnameRecord;
  }
}
