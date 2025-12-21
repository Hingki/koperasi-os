// Standard Chart of Accounts (COA) codes based on SAK-EP
export enum AccountCode {
  // ASSETS (1)
  CASH_ON_HAND = '1-1001',
  BANK_BCA = '1-1002',
  BANK_BRI = '1-1003',
  LOAN_RECEIVABLE_FLAT = '1-1301',
  LOAN_RECEIVABLE_EFFECTIVE = '1-1302',
  INVENTORY_MERCHANDISE = '1-1401', // Persediaan Barang Dagang
  
  // LIABILITIES (2)
  SAVINGS_VOLUNTARY = '2-1001', // Simpanan Sukarela
  SAVINGS_MANDATORY = '2-1002', // Simpanan Wajib
  SAVINGS_PRINCIPAL = '2-1003', // Simpanan Pokok
  ACCOUNTS_PAYABLE = '2-1101', // Hutang Usaha
  
  // EQUITY (3)
  RETAINED_EARNINGS = '3-1001',
  
  // REVENUE (4)
  INTEREST_INCOME_LOAN = '4-1001',
  ADMIN_FEE_INCOME = '4-1002',
  PENALTY_INCOME = '4-1003',
  SALES_REVENUE = '4-2001', // Pendapatan Penjualan Toko
  
  // EXPENSES (5)
  INTEREST_EXPENSE_SAVINGS = '5-1001',
  COGS = '5-1101', // Harga Pokok Penjualan
  OPERATIONAL_EXPENSE = '5-2001'
}

export interface LedgerTransaction {
  koperasi_id: string;
  tx_type: 'loan_disbursement' | 'loan_repayment' | 'savings_deposit' | 'savings_withdrawal' | 'journal_adjustment' | 'retail_purchase' | 'retail_sale';
  tx_reference: string; // e.g. Loan Code or Trx ID
  account_debit: AccountCode;
  account_credit: AccountCode;
  amount: number;
  description: string;
  source_table: string;
  source_id: string;
  metadata?: Record<string, any>;
  created_by: string;
}
