export interface ManagementBoard {
  id: string;
  koperasi_id: string;
  member_id?: string | null;
  position: string;
  start_date?: string | null;
  end_date?: string | null;
  is_active: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface PaymentSource {
  id: string;
  koperasi_id: string;
  unit_usaha_id?: string | null;
  name: string;
  method: 'cash' | 'qris' | 'va' | 'savings_balance' | 'transfer';
  provider: 'mock' | 'xendit' | 'midtrans' | 'manual' | 'internal';
  account_code?: string | null;
  metadata?: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}

export interface EmailSettings {
  id: string;
  koperasi_id: string;
  provider: 'smtp';
  smtp_host?: string | null;
  smtp_port: number;
  smtp_username?: string | null;
  smtp_password?: string | null;
  from_name?: string | null;
  from_email?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
}
