// Standard Chart of Accounts (COA) codes based on SAK-EP
export enum AccountCode {
  // ASSETS (1)
  CASH_ON_HAND = '1-1001',
  BANK_BCA = '1-1002',
  BANK_BRI = '1-1003',
  ACCOUNTS_RECEIVABLE = '1-1101', // Piutang Usaha (General/Retail)
  LOAN_RECEIVABLE_FLAT = '1-1301',
  LOAN_RECEIVABLE_EFFECTIVE = '1-1302',
  FINANCING_RECEIVABLE = '1-1303', // Piutang Pembiayaan (Murabahah)
  INVENTORY_MERCHANDISE = '1-1401', // Persediaan Barang Dagang
  INVENTORY_MEDICINE = '1-1402', // Persediaan Obat-obatan
  VAT_IN = '1-1601', // PPN Masukan
  PPOB_DEPOSIT = '1-1501', // Deposit PPOB (Aset Lancar)

  // LIABILITIES (2)
  SAVINGS_VOLUNTARY = '2-1001', // Simpanan Sukarela
  SAVINGS_MANDATORY = '2-1002', // Simpanan Wajib
  SAVINGS_PRINCIPAL = '2-1003', // Simpanan Pokok
  SAVINGS_PLANNED = '2-1004',   // Simpanan Rencana
  SAVINGS_TIME = '2-1005',      // Simpanan Berjangka
  ACCOUNTS_PAYABLE = '2-1101', // Hutang Usaha
  CONSIGNMENT_PAYABLE = '2-1102', // Hutang Konsinyasi
  VAT_OUT = '2-1201', // PPN Keluaran
  UNEARNED_FINANCING_INCOME = '2-1301', // Pendapatan Ditangguhkan (Margin Murabahah)

  // EQUITY (3)
  RETAINED_EARNINGS = '3-1001',
  EQUITY_CAPITAL_PARTICIPATION = '3-2001', // Modal Penyertaan

  // REVENUE (4)
  INTEREST_INCOME_LOAN = '4-1001',
  ADMIN_FEE_INCOME = '4-1002',
  PENALTY_INCOME = '4-1003',
  FINANCING_INCOME_MARGIN = '4-1004', // Pendapatan Margin Pembiayaan
  SALES_REVENUE = '4-2001', // Pendapatan Penjualan Toko
  SALES_REVENUE_PHARMACY = '4-2002', // Pendapatan Penjualan Obat
  SERVICE_INCOME_PHARMACY = '4-2003', // Pendapatan Jasa/Tuslah
  RENTAL_REVENUE = '4-3001', // Pendapatan Sewa
  PPOB_REVENUE = '4-4001', // Pendapatan PPOB
  OTHER_INCOME = '4-9001', // Pendapatan Lain-lain

  // EXPENSES (5)
  INTEREST_EXPENSE_SAVINGS = '5-1001',
  COGS = '5-1101', // Harga Pokok Penjualan
  INVENTORY_ADJUSTMENT = '5-1102', // Selisih Stok Opname
  OPERATIONAL_EXPENSE = '5-2001'
}

export interface LedgerTransaction {
  koperasi_id: string;
  tx_type: 'loan_disbursement' | 'loan_repayment' | 'savings_deposit' | 'savings_withdrawal' | 'journal_adjustment' | 'retail_purchase' | 'retail_sale' | 'retail_purchase_return' | 'retail_sales_return' | 'rental_transaction' | 'rental_payment' | 'retail_purchase_payment' | 'retail_sales_return_cogs' | 'capital_investment' | 'ppob_sales' | 'ppob_cost';
  tx_reference: string; // e.g. Loan Code or Trx ID
  account_debit: string; // Changed from AccountCode to string to allow flexibility, or keep AccountCode if strict
  account_credit: string;
  amount: number;
  description: string;
  source_table: string;
  source_id: string;
  metadata?: Record<string, any>;
  created_by: string;
  is_test_transaction?: boolean;
}

// AccountingEventType: canonical event names for accounting engine
export type AccountingEventType =
  | 'SAVINGS_DEPOSIT'
  | 'SAVINGS_WITHDRAWAL'
  | 'LOAN_DISBURSEMENT'
  | 'LOAN_REPAYMENT'
  | 'FINANCING_DISBURSEMENT'
  | 'FINANCING_REPAYMENT'
  | 'RETAIL_SALE'
  | 'RETAIL_PURCHASE'
  | 'RETAIL_PURCHASE_RETURN'
  | 'RETAIL_SALES_RETURN'
  | 'PAYMENT_RECEIPT'
  | 'JOURNAL_ADJUSTMENT';

// LedgerIntent: contract describing intent to record a balanced entry
export interface LedgerIntent {
  koperasi_id: string;
  event_type: AccountingEventType;
  transaction_date: string; // YYYY-MM-DD
  description: string;
  reference_id?: string | number;
  reference_type?: string;
  lines: {
    account_code: string;
    debit: number;
    credit: number;
    description?: string;
  }[];
  created_by?: string;
  policy?: {
    period_lock_enforced: boolean;
    no_delete: boolean;
  };
}
