
export interface SavingsProduct {
  id: string;
  name: string;
  type: 'pokok' | 'wajib' | 'sukarela' | 'berjangka';
  description?: string;
  min_deposit: number;
  max_deposit?: number;
  interest_rate: number;
  is_active: boolean;
  is_withdrawal_allowed: boolean;
}

export interface Account {
  id: string;
  member_id: string;
  product_id: string;
  account_number: string;
  balance: number;
  status: 'active' | 'closed' | 'blocked';
  created_at: string;
  updated_at: string;
  product?: SavingsProduct;
}

export interface SavingsTransaction {
  id: string;
  account_id: string;
  member_id: string;
  type: 'deposit' | 'withdrawal' | 'interest' | 'admin_fee' | 'transfer';
  amount: number;
  balance_after: number;
  description?: string;
  created_at: string;
  created_by?: string;
}

export interface WithdrawalRequest {
  id: string;
  member_id: string;
  account_id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  bank_name: string;
  account_number: string;
  account_holder: string;
  admin_note?: string;
  created_at: string;
  updated_at: string;
  account?: Account;
}
