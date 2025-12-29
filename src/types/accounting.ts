export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense';
export type NormalBalance = 'DEBIT' | 'CREDIT';

export interface Account {
  id: string;
  koperasi_id: string;
  code: string;
  name: string;
  type: AccountType;
  normal_balance: NormalBalance;
  parent_id?: string | null;
  is_active: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface JournalEntry {
  id: string;
  koperasi_id: string;
  transaction_date: string;
  business_unit?: string;
  description: string;
  reference_id?: string; // ID of the related entity (e.g., loan_id, member_id)
  reference_type?: string; // e.g., 'LOAN_DISBURSEMENT', 'SAVINGS_DEPOSIT'
  created_by: string;
  created_at: string;
  updated_at: string;
  lines?: JournalLine[];
}

export interface JournalLine {
  id: string;
  journal_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description?: string;
  created_at: string;
  account?: Account; // For joined queries
}

export interface LedgerBalance {
  account_id: string;
  account_name: string;
  account_code: string;
  period_start: string;
  period_end: string;
  opening_balance: number;
  total_debit: number;
  total_credit: number;
  closing_balance: number;
}

export interface TrialBalanceItem {
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
}
