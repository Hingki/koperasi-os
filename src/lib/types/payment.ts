export type PaymentTransactionType = 'retail_sale' | 'loan_payment' | 'savings_deposit';
export type PaymentMethod = 'cash' | 'qris' | 'va' | 'savings_balance' | 'transfer';
export type PaymentProviderType = 'mock' | 'xendit' | 'midtrans' | 'manual' | 'internal';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'expired' | 'refunded';

export interface PaymentTransaction {
  id: string;
  koperasi_id: string;
  transaction_type: PaymentTransactionType;
  reference_id: string;
  payment_method: PaymentMethod;
  payment_provider: PaymentProviderType;
  amount: number;
  status: PaymentStatus;
  external_id?: string;
  qr_code_url?: string;
  va_number?: string;
  webhook_payload?: any;
  description?: string;
  metadata?: any;
  expired_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface QRISPaymentParams {
  transaction_id: string; // Internal DB ID
  amount: number;
  description?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  expires_in_minutes?: number; // default 5 or 15
}

export interface QRISResponse {
  transaction_id: string;
  external_id: string;
  qr_string: string; // The raw string for QR code
  qr_image_url?: string; // Optional hosted image URL
  status: PaymentStatus;
  expires_at: string;
}

export interface VAPaymentParams {
  transaction_id: string;
  amount: number;
  bank_code: string; // BCA, BRI, MANDIRI, etc.
  customer_name: string;
  description?: string;
  expires_in_minutes?: number;
}

export interface VAResponse {
  transaction_id: string;
  external_id: string;
  va_number: string;
  bank_code: string;
  status: PaymentStatus;
  expires_at: string;
}

export interface PaymentCallback {
  transaction_id: string;
  external_id: string;
  status: PaymentStatus;
  amount: number;
  paid_at?: string;
  raw_payload: any;
}
