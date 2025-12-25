-- Migration: Create Missing Indexes for Performance Optimization
-- Description: Adds indexes for FKs and RLS columns on high-traffic tables
-- Date: 2025-12-26

-- 1. ledger_entry (Partitioned)
-- FKs and commonly queried columns
CREATE INDEX IF NOT EXISTS idx_ledger_entry_period ON ledger_entry(period_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_account_debit ON ledger_entry(account_debit);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_account_credit ON ledger_entry(account_credit);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_tx_id ON ledger_entry(tx_id);

-- 2. pos_transactions
-- FKs and RLS columns
CREATE INDEX IF NOT EXISTS idx_pos_transactions_koperasi ON pos_transactions(koperasi_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_member ON pos_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_unit ON pos_transactions(unit_usaha_id);
-- Lookup columns
CREATE INDEX IF NOT EXISTS idx_pos_transactions_date ON pos_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_invoice ON pos_transactions(invoice_number);

-- 3. inventory_products
-- FKs and RLS columns
CREATE INDEX IF NOT EXISTS idx_inventory_products_koperasi ON inventory_products(koperasi_id);
CREATE INDEX IF NOT EXISTS idx_inventory_products_category ON inventory_products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_products_supplier ON inventory_products(supplier_id);
-- Lookup columns
CREATE INDEX IF NOT EXISTS idx_inventory_products_barcode ON inventory_products(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_products_name ON inventory_products(name);

-- 4. loan_repayment_schedule
-- RLS column (member_id) - loan_id and due_date are already indexed
CREATE INDEX IF NOT EXISTS idx_loan_schedule_member ON loan_repayment_schedule(member_id);

-- 5. Additional RLS Optimization for User Roles
-- Often joined for permission checks
CREATE INDEX IF NOT EXISTS idx_user_role_user_koperasi ON user_role(user_id, koperasi_id);
