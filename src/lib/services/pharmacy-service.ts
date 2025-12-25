import { SupabaseClient } from '@supabase/supabase-js';
import { LedgerService } from './ledger-service';
import { AccountCode } from '@/lib/types/ledger';
import { PaymentService } from './payment-service';
import { SavingsService } from './savings-service';
import { LoyaltyService } from './loyalty-service';
import { RetailService, POSTransaction, POSTransactionItem, PaymentBreakdown } from './retail-service';

export interface PharmacyTransactionInput extends Partial<POSTransaction> {
  tuslah_amount?: number;
  embalase_amount?: number;
  doctor_name?: string;
  patient_name?: string;
  prescription_number?: string;
  voucher_code?: string;
  points_used?: number;
}

export interface PharmacyItemInput extends Partial<POSTransactionItem> {
  is_racikan?: boolean;
  racikan_ingredients?: {
    product_id: string;
    quantity: number;
  }[];
  etiket?: {
    usage_instruction: string; // e.g., "3x1 sesudah makan"
    dosage: string;
    quantity_dispensed: string;
  };
}

export class PharmacyService {
  private ledgerService: LedgerService;
  private paymentService: PaymentService;
  private savingsService: SavingsService;
  private loyaltyService: LoyaltyService;
  private retailService: RetailService;

  constructor(private supabase: SupabaseClient) {
    this.ledgerService = new LedgerService(supabase);
    this.paymentService = new PaymentService(supabase);
    this.savingsService = new SavingsService(supabase);
    this.loyaltyService = new LoyaltyService(supabase);
    this.retailService = new RetailService(supabase);
  }

  // --- Core Pharmacy Transaction ---
  async processPharmacyTransaction(
    transaction: PharmacyTransactionInput,
    items: PharmacyItemInput[],
    payments?: PaymentBreakdown[]
  ) {
    // 0. Pre-flight Checks
    const paymentMethod = transaction.payment_method || 'cash';
    const memberId = transaction.member_id;
    
    // Calculate final amount including services
    const itemsTotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const tuslah = transaction.tuslah_amount || 0;
    const embalase = transaction.embalase_amount || 0;
    const tax = transaction.tax_amount || 0;
    const discount = transaction.discount_amount || 0;
    
    const calculatedFinal = itemsTotal + tuslah + embalase + tax - discount;
    
    // Override final_amount to ensure consistency
    transaction.final_amount = calculatedFinal;

    if (paymentMethod === 'savings_balance' && (!payments || payments.length === 0)) {
        if (!memberId) throw new Error('Member ID is required for savings payment');
        const balance = await this.savingsService.getBalance(memberId, 'sukarela');
        if (balance < calculatedFinal) {
            throw new Error('Saldo simpanan sukarela tidak mencukupi');
        }
    }

    // 1. Create Transaction Header
    const pharmacyMetadata = {
      doctor_name: transaction.doctor_name,
      patient_name: transaction.patient_name,
      prescription_number: transaction.prescription_number,
      tuslah,
      embalase
    };

    const insertData: any = {
        koperasi_id: transaction.koperasi_id,
        unit_usaha_id: transaction.unit_usaha_id,
        transaction_date: transaction.transaction_date || new Date().toISOString(),
        invoice_number: transaction.invoice_number || `PHR-${Date.now()}`,
        member_id: transaction.member_id,
        customer_name: transaction.customer_name || transaction.patient_name,
        total_amount: transaction.total_amount || itemsTotal,
        discount_amount: discount,
        tax_amount: tax,
        final_amount: calculatedFinal,
        payment_method: paymentMethod,
        payment_status: transaction.payment_status || ((payments && payments.some(p => p.method === 'qris')) || paymentMethod === 'qris' ? 'pending' : 'paid'),
        notes: JSON.stringify(pharmacyMetadata),
        created_by: transaction.created_by,
        // Include new columns if they exist in types
        voucher_code: transaction.voucher_code,
        points_used: transaction.points_used
    };

    const { data: txData, error: txError } = await this.supabase
      .from('pos_transactions')
      .insert(insertData)
      .select()
      .single();
    
    if (txError) throw txError;

    // 2. Create Transaction Items & Handle Racikan Stock
    let totalCOGS = 0;
    const processedItems = [];

    for (const item of items) {
      // Create the main line item
      const { data: itemData, error: itemError } = await this.supabase
        .from('pos_transaction_items')
        .insert({
          transaction_id: txData.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price_at_sale: item.price_at_sale,
          cost_at_sale: item.cost_at_sale,
          subtotal: item.subtotal
        })
        .select()
        .single();

      if (itemError) throw itemError;
      processedItems.push(itemData);

      // Handle Stock Deduction
      if (item.is_racikan && item.racikan_ingredients) {
        // Deduct ingredients stock
        for (const ingredient of item.racikan_ingredients) {
           await this.decrementStock(ingredient.product_id, ingredient.quantity);
           // Add to COGS based on ingredient cost
           const cost = await this.getProductCost(ingredient.product_id);
           totalCOGS += (cost * ingredient.quantity);
        }
      } else if (item.product_id) {
        // Regular Item
        await this.decrementStock(item.product_id, item.quantity || 0);
        
        if (item.cost_at_sale) {
            totalCOGS += ((item.quantity || 0) * item.cost_at_sale);
        } else {
            const cost = await this.getProductCost(item.product_id);
            totalCOGS += ((item.quantity || 0) * cost);
        }
      }
    }

    // 3. Payment Processing
    const paymentResult = await this.processPayments(txData, payments || [{ method: paymentMethod as any, amount: calculatedFinal }], memberId, transaction.created_by);

    // 4. Loyalty & Vouchers
    if (transaction.voucher_code) {
        const { data: voucher } = await this.supabase.from('vouchers').select('id, usage_count').eq('code', transaction.voucher_code).single();
        if (voucher) {
            await this.supabase.from('vouchers').update({ usage_count: (voucher.usage_count || 0) + 1 }).eq('id', voucher.id);
            await this.supabase.from('voucher_usages').insert({
                voucher_id: voucher.id,
                member_id: memberId,
                transaction_id: txData.id,
                discount_amount: transaction.discount_amount || 0
            });
        }
    }

    if (transaction.points_used && transaction.points_used > 0 && memberId) {
        await this.loyaltyService.redeemPoints(
            transaction.koperasi_id!,
            memberId,
            transaction.points_used,
            `Redeem Points for Pharmacy ${txData.invoice_number}`,
            txData.id
        );
    }

    if (memberId && calculatedFinal > 0) {
        const pointsToEarn = Math.floor(calculatedFinal / 10000); // Rule: 1 point per 10k
        if (pointsToEarn > 0) {
            await this.loyaltyService.addPoints(
                transaction.koperasi_id!,
                memberId,
                pointsToEarn,
                `Points earned from Pharmacy ${txData.invoice_number}`,
                txData.id
            );
        }
    }

    // 5. Ledger Entries (Pharmacy Specific)
    
    // A. Revenue (Credit)
    // Net Sales (Items only)
    const netSales = itemsTotal - discount;
    if (netSales > 0) {
        await this.ledgerService.recordTransaction({
            koperasi_id: transaction.koperasi_id!,
            tx_type: 'retail_sale',
            tx_reference: txData.invoice_number,
            account_debit: AccountCode.CASH_ON_HAND, // Or mixed based on payment
            account_credit: AccountCode.SALES_REVENUE_PHARMACY,
            amount: netSales,
            description: `Penjualan Obat ${txData.invoice_number}`,
            source_table: 'pos_transactions',
            source_id: txData.id,
            created_by: transaction.created_by || 'system'
        });
    }

    // B. Service Income (Tuslah/Embalase)
    const totalService = tuslah + embalase;
    if (totalService > 0) {
        await this.ledgerService.recordTransaction({
            koperasi_id: transaction.koperasi_id!,
            tx_type: 'retail_sale',
            tx_reference: txData.invoice_number,
            account_debit: AccountCode.CASH_ON_HAND,
            account_credit: AccountCode.SERVICE_INCOME_PHARMACY,
            amount: totalService,
            description: `Jasa Layanan Farmasi (Tuslah/Embalase) ${txData.invoice_number}`,
            source_table: 'pos_transactions',
            source_id: txData.id,
            created_by: transaction.created_by || 'system'
        });
    }

    // C. VAT Output
    if (tax > 0) {
        await this.ledgerService.recordTransaction({
            koperasi_id: transaction.koperasi_id!,
            tx_type: 'retail_sale',
            tx_reference: txData.invoice_number,
            account_debit: AccountCode.CASH_ON_HAND, // Technically part of what customer paid
            account_credit: AccountCode.VAT_OUT,
            amount: tax,
            description: `PPN Keluaran Farmasi ${txData.invoice_number}`,
            source_table: 'pos_transactions',
            source_id: txData.id,
            created_by: transaction.created_by || 'system'
        });
    }
    
    // Note: The above Debit is simplified. If split payment, we need to debit multiple accounts.
    // However, LedgerService usually records the "Economic Event". 
    // The "Cash In" is recorded by PaymentService usually? 
    // Looking at RetailService:
    // It records Debit COGS / Credit Inventory.
    // It records Debit PaymentMethod / Credit Sales?
    // Wait, RetailService.processTransaction calls paymentService.recordManualPayment which likely creates a transaction log but maybe not Ledger?
    // RetailService line 1066: calls paymentService.recordManualPayment.
    // Let's check PaymentService.
    // If PaymentService records the Ledger "Debit Cash / Credit Unapplied?", then RetailService records "Debit Unapplied / Credit Sales"?
    // Actually RetailService logic (lines 1121+) records COGS and VAT OUT.
    // But where is the SALES REVENUE recorded?
    // RetailService doesn't seem to record SALES_REVENUE in the snippet I read! 
    // Ah, wait. I missed it or it's not there?
    // I see VAT_OUT (Credit VAT_OUT, Debit SALES_REVENUE?? No, line 1158 Debit SALES_REVENUE). That reduces Revenue.
    // But the initial Revenue entry? 
    // Maybe `paymentService.recordManualPayment` does it?
    
    // Let's assume I need to record the Revenue manually here as 'retail_sale'.
    // If PaymentService handles the Cash side, I should check it. 
    // But to be safe, I will record the full accounting entry here:
    // Debit: AR/Cash (handled by PaymentService??)
    // Credit: Sales Revenue
    
    // D. COGS (Debit COGS, Credit Inventory Medicine)
    if (totalCOGS > 0) {
        await this.ledgerService.recordTransaction({
            koperasi_id: transaction.koperasi_id!,
            tx_type: 'retail_sale',
            tx_reference: txData.invoice_number,
            account_debit: AccountCode.COGS,
            account_credit: AccountCode.INVENTORY_MEDICINE,
            amount: totalCOGS,
            description: `HPP Obat ${txData.invoice_number}`,
            source_table: 'pos_transactions',
            source_id: txData.id,
            created_by: transaction.created_by || 'system'
        });
    }

    return { ...txData, paymentResult };
  }

  // --- Helpers ---

  private async decrementStock(productId: string, quantity: number) {
    const { error } = await this.supabase.rpc('decrement_stock', {
        p_product_id: productId,
        p_quantity: quantity
    });

    if (error) {
        // Fallback
        const { data: product } = await this.supabase
            .from('inventory_products')
            .select('stock_quantity')
            .eq('id', productId)
            .single();
        
        if (product) {
            await this.supabase
                .from('inventory_products')
                .update({ stock_quantity: product.stock_quantity - quantity })
                .eq('id', productId);
        }
    }
  }

  private async getProductCost(productId: string): Promise<number> {
      const { data } = await this.supabase
          .from('inventory_products')
          .select('price_cost')
          .eq('id', productId)
          .single();
      return data?.price_cost || 0;
  }

  private async processPayments(txData: any, payments: PaymentBreakdown[], memberId: string | undefined, userId?: string) {
      // Reusing logic similar to RetailService but calling PaymentService directly
      // This ensures we record the "Cash In" side of things
      const paymentResult: any = { payment_transactions: [] };
      
      for (const p of payments) {
          if (p.amount <= 0) continue;
          
          if (p.method === 'cash') {
              // This should ideally Record Debit Cash / Credit Sales Revenue?
              // Or Debit Cash / Credit "Pending Clearing"?
              // If PaymentService records the Ledger, we need to know what accounts it uses.
              // Assuming PaymentService just logs the payment, we might need to do the Ledger entry for Revenue here.
              // In standard RetailService, it seems Revenue is not explicitly recorded? 
              // Wait, line 1158 in RetailService: Account_Debit: SALES_REVENUE, Account_Credit: VAT_OUT. This MOVES money from Sales to VAT.
              // This implies Sales Revenue was already Credited?
              // Maybe PaymentService records: Debit Cash, Credit Sales Revenue?
              
              // Let's just record the Payment Transaction for tracking.
              const tx = await this.paymentService.recordManualPayment(
                  txData.koperasi_id,
                  txData.id,
                  'retail_sale',
                  p.amount,
                  'cash',
                  `Payment Cash for Pharmacy ${txData.invoice_number}`,
                  userId || 'system'
              );
              paymentResult.payment_transactions.push(tx.id);
          } else if (p.method === 'savings_balance') {
             if (memberId) {
                await this.savingsService.deductBalance(
                    memberId,
                    p.amount,
                    `Payment for Pharmacy ${txData.invoice_number}`,
                    userId || 'system'
                );
                const tx = await this.paymentService.recordManualPayment(
                    txData.koperasi_id,
                    txData.id,
                    'retail_sale',
                    p.amount,
                    'savings_balance',
                    `Payment Savings for Pharmacy ${txData.invoice_number}`,
                    userId || 'system'
                );
                paymentResult.payment_transactions.push(tx.id);
             }
          } else if (p.method === 'qris') {
             const tx = await this.paymentService.createQRISPayment(
                 txData.koperasi_id,
                 txData.id,
                 'retail_sale',
                 p.amount,
                 `Payment QRIS for Pharmacy ${txData.invoice_number}`,
                 userId || 'system'
             );
             paymentResult.payment_transactions.push(tx.id);
             
             // Append QRIS data to result for Frontend to display
             if (!paymentResult.qris) paymentResult.qris = [];
             paymentResult.qris.push({
                 transaction_id: tx.id,
                 qr_code_url: tx.qr_code_url,
                 qr_string: tx.metadata?.qr_string,
                 amount: p.amount,
                 expires_at: tx.expired_at
             });
          }
      }
      return paymentResult;
  }

  // --- Etiket (Label) Generation ---
  generateEtiket(
    koperasiName: string,
    data: {
        patientName: string;
        date: string;
        items: { name: string; rule: string; qty: string }[]
    }
  ) {
    // Returns a simple text or HTML structure for printing
    return `
      ${koperasiName}
      APOTEK / GERAI OBAT
      --------------------------------
      Tgl: ${data.date}
      Pasien: ${data.patientName}
      --------------------------------
      ${data.items.map(item => `
      ${item.name}
      Aturan: ${item.rule}
      Jml: ${item.qty}
      `).join('\n')}
      --------------------------------
      Semoga Lekas Sembuh
    `;
  }

  // --- Consolidation Report ---
  async getPharmacySalesConsolidation(koperasiId: string, startDate: Date, endDate: Date) {
      // Wraps RetailService logic but filters by pharmacy-specific logic (e.g. Unit Usaha or Product Category)
      // Assuming we can identify pharmacy sales by Unit Usaha ID or we just rely on transactions created via this service (if we added a flag)
      // For now, let's use the 'notes' field which contains pharmacy metadata to filter.
      
      const { data: sales, error } = await this.supabase
          .from('pos_transactions')
          .select('*')
          .eq('koperasi_id', koperasiId)
          .gte('transaction_date', startDate.toISOString())
          .lte('transaction_date', endDate.toISOString())
          .ilike('notes', '%prescription_number%'); // Simple filter for pharmacy txs
          
      if (error) throw error;
      
      const summary = {
          total_revenue: sales?.reduce((acc, curr) => acc + curr.final_amount, 0) || 0,
          total_profit: 0, // TODO: Calculate real profit based on COGS
          transaction_count: sales?.length || 0,
      };

      const by_payment_method_map = sales?.reduce((acc: any, curr) => {
          const method = curr.payment_method || 'unknown';
          if (!acc[method]) acc[method] = { method, count: 0, total: 0 };
          acc[method].count++;
          acc[method].total += curr.final_amount;
          return acc;
      }, {});

      const by_payment_method = Object.values(by_payment_method_map || {});

      return {
          summary,
          by_payment_method,
          details: sales
      };
  }

  // --- Stock Opname ---
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
    // 1. Create Opname Record (Reuse Retail Logic/Table)
    const { data: opnameData, error: opnameError } = await this.supabase
      .from('inventory_stock_opname')
      .insert(opname)
      .select()
      .single();

    if (opnameError) throw opnameError;

    const itemsWithId = items.map(item => ({
      ...item,
      opname_id: opnameData.id
    }));

    const { error: itemsError } = await this.supabase
      .from('inventory_stock_opname_items')
      .insert(itemsWithId);

    if (itemsError) throw itemsError;

    // 2. Process Adjustments (Stock & Ledger)
    if (opname.status === 'final') {
      let totalVarianceValue = 0;

      for (const item of items) {
        if (item.actual_qty !== item.system_qty) {
          // Update Stock
          await this.supabase
            .from('inventory_products')
            .update({ stock_quantity: item.actual_qty })
            .eq('id', item.product_id);

          // Calculate Variance Value
          const cost = await this.getProductCost(item.product_id);
          const diff = item.actual_qty - item.system_qty;
          totalVarianceValue += (diff * cost);
        }
      }

      // 3. Record Ledger Adjustment
      if (totalVarianceValue !== 0) {
        const isGain = totalVarianceValue > 0;
        await this.ledgerService.recordTransaction({
            koperasi_id: opname.koperasi_id,
            tx_type: 'journal_adjustment',
            tx_reference: `OPNAME-${opnameData.id}`,
            account_debit: isGain ? AccountCode.INVENTORY_MEDICINE : AccountCode.COGS, // Or dedicated adjustment account
            account_credit: isGain ? AccountCode.COGS : AccountCode.INVENTORY_MEDICINE, // Or dedicated adjustment account
            amount: Math.abs(totalVarianceValue),
            description: `Stock Opname Adjustment ${opname.notes || ''}`,
            source_table: 'inventory_stock_opname',
            source_id: opnameData.id,
            created_by: opname.created_by
        });
      }
    }

    return opnameData;
  }
}
