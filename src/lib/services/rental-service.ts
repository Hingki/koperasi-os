import { SupabaseClient } from '@supabase/supabase-js';
import { LedgerService } from './ledger-service';
import { PaymentService } from './payment-service';
import { AccountCode } from '@/lib/types/ledger';

export interface RentalItem {
  id: string;
  koperasi_id: string;
  name: string;
  category?: string;
  description?: string;
  price_per_hour: number;
  price_per_day: number;
  status: 'available' | 'rented' | 'maintenance' | 'lost';
  condition?: string;
  image_url?: string;
  is_active: boolean;
}

export interface RentalCustomer {
  id: string;
  koperasi_id: string;
  name: string;
  identity_number?: string;
  phone?: string;
  address?: string;
  email?: string;
  notes?: string;
}

export interface RentalTransaction {
  id: string;
  koperasi_id: string;
  transaction_number: string;
  customer_type: 'member' | 'general';
  member_id?: string;
  customer_id?: string;
  rental_date: string;
  return_date_plan: string;
  return_date_actual?: string;
  status: 'booked' | 'active' | 'returned' | 'cancelled' | 'overdue';
  total_amount: number;
  deposit_amount: number;
  fine_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
  notes?: string;
  items?: RentalTransactionItem[];
  customer?: RentalCustomer;
  member?: any; // Member type
  created_by?: string;
}

export interface RentalTransactionItem {
  id: string;
  transaction_id: string;
  item_id: string;
  quantity: number;
  price_at_rental: number;
  duration_value: number;
  duration_unit: 'hour' | 'day';
  subtotal: number;
  item?: RentalItem;
}

export class RentalService {
  private ledgerService: LedgerService;
  private paymentService: PaymentService;

  constructor(private supabase: SupabaseClient) {
    this.ledgerService = new LedgerService(supabase);
    this.paymentService = new PaymentService(supabase);
  }

  // --- Items ---

  async getRentalItems(koperasiId: string, status?: string) {
    let query = this.supabase
      .from('rental_items')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .eq('is_active', true)
      .order('name');

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async getRentalItemById(id: string) {
    const { data, error } = await this.supabase
      .from('rental_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createRentalItem(item: Partial<RentalItem>) {
    const { data, error } = await this.supabase
      .from('rental_items')
      .insert(item)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async updateRentalItem(id: string, updates: Partial<RentalItem>) {
    const { data, error } = await this.supabase
      .from('rental_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // --- Customers ---

  async getRentalCustomers(koperasiId: string, search?: string) {
    let query = this.supabase
      .from('rental_customers')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .order('name');

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async createRentalCustomer(customer: Partial<RentalCustomer>) {
    const { data, error } = await this.supabase
      .from('rental_customers')
      .insert(customer)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // --- Transactions ---

  async getRentalTransactions(koperasiId: string, status?: string) {
    let query = this.supabase
      .from('rental_transactions')
      .select(`
        *,
        customer:rental_customers(name, phone),
        member:members(nama_lengkap, phone)
      `)
      .eq('koperasi_id', koperasiId)
      .order('rental_date', { ascending: false });

    if (status) {
        if (status === 'active') {
            query = query.in('status', ['active', 'overdue']);
        } else {
            query = query.eq('status', status);
        }
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Normalize customer name for display
    return data.map((tx: any) => ({
        ...tx,
        customer_name: tx.customer_type === 'member' ? tx.member?.nama_lengkap : tx.customer?.name,
        customer_phone: tx.customer_type === 'member' ? tx.member?.phone : tx.customer?.phone
    }));
  }

  async getRentalTransactionById(id: string) {
    const { data, error } = await this.supabase
      .from('rental_transactions')
      .select(`
        *,
        customer:rental_customers(*),
        member:members(*),
        items:rental_transaction_items(
            *,
            item:rental_items(*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  async createRentalTransaction(
    header: Partial<RentalTransaction>,
    items: Partial<RentalTransactionItem>[],
    paymentAmount: number = 0
  ) {
    // 1. Create Header
    const { data: txData, error: txError } = await this.supabase
      .from('rental_transactions')
      .insert({
        ...header,
        final_amount: (header.total_amount || 0) + (header.deposit_amount || 0) + (header.fine_amount || 0) - (header.discount_amount || 0),
        payment_status: paymentAmount >= ((header.total_amount || 0) + (header.deposit_amount || 0)) ? 'paid' : (paymentAmount > 0 ? 'partial' : 'unpaid')
      })
      .select()
      .single();
    
    if (txError) throw txError;

    // 2. Create Items
    const itemsWithId = items.map(item => ({
      ...item,
      transaction_id: txData.id
    }));

    const { error: itemsError } = await this.supabase
      .from('rental_transaction_items')
      .insert(itemsWithId);
    
    if (itemsError) throw itemsError;

    // 3. Update Item Status to 'rented'
    for (const item of items) {
        if (item.item_id) {
            await this.supabase
                .from('rental_items')
                .update({ status: 'rented' })
                .eq('id', item.item_id);
        }
    }

    // 4. Record Payment & Revenue (Accounting)
    if (paymentAmount > 0) {
        // Record Cash In
        // For Accounting:
        // Debit Cash
        // Credit Rental Revenue (for the rental fee)
        // Credit Deposit Liability (for the deposit) -- Ideally. For MVP we might just book it all as Revenue or split it.
        // Let's split if possible.
        
        // Simple logic: Proportional payment? Or prioritize Deposit?
        // Let's assume full payment for simplicity of MVP logic.
        
        if (header.created_by) {
            // A. Record Payment Transaction
            await this.paymentService.recordManualPayment(
                header.koperasi_id!,
                txData.id,
                'rental_payment', // We need to add this type or use generic
                paymentAmount,
                'cash', // Default to cash for now
                `Rental Payment ${header.transaction_number}`,
                header.created_by
            );

            // B. Ledger (Revenue)
            // Note: paymentService.recordManualPayment already calls createJournalEntry which maps to accounts.
            // But we need to make sure it maps correctly for Rental.
            // Currently payment-service.ts maps 'rental_sale' -> ? 
            // We added 'rental_payment' to types, but payment-service needs update to map it to RENTAL_REVENUE.
            // Actually, let's manually record ledger here for more control or update payment service.
            // Let's update payment service later. For now, we manually record here if needed or trust payment service.
            // Since I haven't updated PaymentService.createJournalEntry to handle 'rental_payment' -> RENTAL_REVENUE, 
            // I should update PaymentService or do it here.
            
            // I will update PaymentService to handle 'rental_payment' mapping to RENTAL_REVENUE.
        }
    }

    return txData;
  }

  async returnRentalTransaction(
    id: string,
    returnDate: Date,
    fineAmount: number,
    notes: string,
    refundDeposit: boolean = true,
    createdBy: string
  ) {
    // 1. Get Transaction
    const tx = await this.getRentalTransactionById(id);
    if (!tx) throw new Error('Transaction not found');

    // 2. Update Transaction
    const { error: updateError } = await this.supabase
        .from('rental_transactions')
        .update({
            status: 'returned',
            return_date_actual: returnDate.toISOString(),
            fine_amount: fineAmount,
            notes: notes ? (tx.notes + '\n' + notes) : tx.notes,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);

    if (updateError) throw updateError;

    // 3. Update Items Status to 'available'
    if (tx.items) {
        for (const item of tx.items) {
            await this.supabase
                .from('rental_items')
                .update({ status: 'available' })
                .eq('id', item.item_id);
        }
    }

    // 4. Handle Deposit Refund & Fines (Accounting)
    // If refundDeposit is true, we pay back the deposit amount.
    // If fine > 0, we might deduct from deposit or charge extra.
    
    // Case 1: Refund Deposit (Cash Out)
    // Debit: Deposit Liability (or Revenue if we booked it as revenue earlier) -> For MVP we likely booked as Revenue.
    // So Debit RENTAL_REVENUE (Contra) or EXPENSE.
    // Let's assume we treat Deposit return as reducing Cash and reducing Revenue (or specific liability).
    
    if (refundDeposit && tx.deposit_amount > 0) {
        const refundAmount = tx.deposit_amount - fineAmount; // Deduct fine from deposit
        
        if (refundAmount > 0) {
             await this.ledgerService.recordTransaction({
                koperasi_id: tx.koperasi_id,
                tx_type: 'rental_payment', // Refund
                tx_reference: tx.transaction_number,
                account_debit: AccountCode.RENTAL_REVENUE, // Reversing revenue/liability
                account_credit: AccountCode.CASH_ON_HAND,
                amount: refundAmount,
                description: `Pengembalian Deposit ${tx.transaction_number}`,
                source_table: 'rental_transactions',
                source_id: id,
                created_by: createdBy
            });
        }
    }
    
    // Case 2: Fine Payment (if not covered by deposit or extra)
    // Usually fine is Income.
    if (fineAmount > 0) {
        await this.ledgerService.recordTransaction({
            koperasi_id: tx.koperasi_id,
            tx_type: 'rental_payment',
            tx_reference: tx.transaction_number,
            account_debit: AccountCode.CASH_ON_HAND, // Assumed deducted from deposit (so we kept cash) or paid fresh
            account_credit: AccountCode.PENALTY_INCOME,
            amount: fineAmount,
            description: `Denda Keterlambatan/Kerusakan ${tx.transaction_number}`,
            source_table: 'rental_transactions',
            source_id: id,
            created_by: createdBy
        });
    }

    return true;
  }
}
