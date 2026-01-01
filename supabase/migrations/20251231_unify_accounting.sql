-- Migration: Unify Accounting Schema & Ledger Authority
-- Date: 2025-12-31
-- Description: Establishes single source of truth for financial data

-- 1. Rename Legacy Tables (Archive)
ALTER TABLE IF EXISTS chart_of_accounts RENAME TO chart_of_accounts_legacy;
ALTER TABLE IF EXISTS ledger_entry RENAME TO ledger_entry_legacy;

-- 2. Enhance Journal Lines for Sub-Ledger Tracking
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS entity_id UUID; -- e.g. savings_account_id, loan_id
ALTER TABLE journal_lines ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50); -- e.g. 'savings_account', 'loan'

-- 3. Create Partitioned Ledger Entry (The Truth)
CREATE TABLE IF NOT EXISTS ledger_entry (
    id UUID DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL,
    journal_id UUID NOT NULL REFERENCES journals(id),
    journal_line_id UUID NOT NULL REFERENCES journal_lines(id),
    account_id UUID NOT NULL REFERENCES accounts(id),
    
    debit DECIMAL(20, 2) NOT NULL DEFAULT 0,
    credit DECIMAL(20, 2) NOT NULL DEFAULT 0,
    amount DECIMAL(20, 2) GENERATED ALWAYS AS (debit - credit) STORED, -- Helper for analytical queries
    
    -- Sub-Ledger Links
    entity_id UUID,
    entity_type VARCHAR(50),
    
    transaction_date DATE NOT NULL,
    posting_date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (transaction_date, id)
) PARTITION BY RANGE (transaction_date);

-- Create Partitions for 2024-2026
CREATE TABLE IF NOT EXISTS ledger_entry_2024 PARTITION OF ledger_entry FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE IF NOT EXISTS ledger_entry_2025 PARTITION OF ledger_entry FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS ledger_entry_2026 PARTITION OF ledger_entry FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ledger_entry_account ON ledger_entry(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_journal ON ledger_entry(journal_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entry_entity ON ledger_entry(entity_id, entity_type);

-- 4. Enable RLS on Ledger Entry
ALTER TABLE ledger_entry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View ledger" ON ledger_entry;
CREATE POLICY "View ledger" ON ledger_entry FOR SELECT 
USING (koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()));

-- 5. Trigger: Sync Journal to Ledger
CREATE OR REPLACE FUNCTION sync_journal_to_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_date DATE;
    v_koperasi_id UUID;
BEGIN
    -- Get Header Info
    SELECT transaction_date, koperasi_id INTO v_date, v_koperasi_id
    FROM journals WHERE id = NEW.journal_id;

    -- Insert into Ledger
    INSERT INTO ledger_entry (
        koperasi_id, journal_id, journal_line_id, account_id, 
        debit, credit, transaction_date, entity_id, entity_type
    ) VALUES (
        v_koperasi_id, NEW.journal_id, NEW.id, NEW.account_id, 
        NEW.debit, NEW.credit, v_date, NEW.entity_id, NEW.entity_type
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_journal_to_ledger ON journal_lines;
CREATE TRIGGER trg_sync_journal_to_ledger
AFTER INSERT ON journal_lines
FOR EACH ROW EXECUTE FUNCTION sync_journal_to_ledger();

-- 6. Trigger: Update Savings Balance (Read Model)
CREATE OR REPLACE FUNCTION update_savings_balance_from_ledger()
RETURNS TRIGGER AS $$
DECLARE
    v_delta DECIMAL(20, 2);
BEGIN
    -- Only process if entity_type is savings_account
    IF NEW.entity_type = 'savings_account' AND NEW.entity_id IS NOT NULL THEN
        -- For Liabilities (Savings): Credit increases balance, Debit decreases balance.
        -- Balance Change = Credit - Debit
        v_delta := NEW.credit - NEW.debit;
        
        -- Update Savings Account Balance
        UPDATE savings_accounts
        SET 
            balance = balance + v_delta,
            last_transaction_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.entity_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_savings_balance ON ledger_entry;
CREATE TRIGGER trg_update_savings_balance
AFTER INSERT ON ledger_entry
FOR EACH ROW EXECUTE FUNCTION update_savings_balance_from_ledger();

-- 7. Trigger: Update Loan Balance (Read Model)
CREATE OR REPLACE FUNCTION update_loan_balance_from_ledger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process if entity_type is 'loan'
    IF NEW.entity_type = 'loan' AND NEW.entity_id IS NOT NULL THEN
        -- For Assets (Loan Receivable): Debit increases balance, Credit decreases balance.
        -- However, remaining_principal tracks how much they OWE us.
        -- When we disburse (Debit Receivable), they owe us MORE.
        -- When they repay (Credit Receivable), they owe us LESS.
        -- So remaining_principal Change = Debit - Credit.
        
        -- Update loans table
        UPDATE loans
        SET 
            remaining_principal = remaining_principal + (NEW.debit - NEW.credit),
            -- Update status if fully paid (with tolerance)
            -- Note: We use existing status if not paid, or switch to 'paid' if <= 100
            status = CASE 
                WHEN (remaining_principal + (NEW.debit - NEW.credit)) <= 100 THEN 'paid'
                ELSE 'active' -- Revert to active if reversed? Yes.
            END,
            updated_at = NOW()
        WHERE id = NEW.entity_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_loan_balance ON ledger_entry;
CREATE TRIGGER trg_update_loan_balance
AFTER INSERT ON ledger_entry
FOR EACH ROW EXECUTE FUNCTION update_loan_balance_from_ledger();

-- 8. Update RPC to support Entity Tracking
CREATE OR REPLACE FUNCTION post_journal_entry(
  p_koperasi_id UUID,
  p_business_unit VARCHAR,
  p_transaction_date DATE,
  p_description TEXT,
  p_reference_id VARCHAR,
  p_reference_type VARCHAR,
  p_lines JSONB, -- Array of objects: {account_id, debit, credit, description, entity_id?, entity_type?}
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  v_journal_id UUID;
  v_total_debit DECIMAL(20, 2) := 0;
  v_total_credit DECIMAL(20, 2) := 0;
  v_is_period_closed BOOLEAN;
  v_period_exists BOOLEAN;
BEGIN
  -- 1. Period Lock Awareness Check
  SELECT 
    EXISTS (
      SELECT 1 FROM accounting_period 
      WHERE koperasi_id = p_koperasi_id 
      AND p_transaction_date BETWEEN start_date AND end_date 
      AND status = 'closed'
    ),
    EXISTS (
      SELECT 1 FROM accounting_period
      WHERE koperasi_id = p_koperasi_id
      AND p_transaction_date BETWEEN start_date AND end_date
    )
  INTO v_is_period_closed, v_period_exists;
  
  IF NOT v_period_exists THEN
     RAISE EXCEPTION 'No accounting period defined for date %. Transaction rejected.', p_transaction_date;
  END IF;

  IF v_is_period_closed THEN
    RAISE EXCEPTION 'Accounting period for date % is closed. Transaction rejected.', p_transaction_date;
  END IF;

  -- 2. Double-Entry Validation (Debit = Credit)
  SELECT 
    COALESCE(SUM((line->>'debit')::DECIMAL), 0),
    COALESCE(SUM((line->>'credit')::DECIMAL), 0)
  INTO v_total_debit, v_total_credit
  FROM jsonb_array_elements(p_lines) AS line;
  
  IF ABS(v_total_debit - v_total_credit) > 0.01 THEN
    RAISE EXCEPTION 'Journal entry is not balanced. Debit: %, Credit: %', v_total_debit, v_total_credit;
  END IF;

  IF v_total_debit <= 0 THEN
     RAISE EXCEPTION 'Journal entry must have positive value.';
  END IF;

  -- 3. Insert Journal Header
  INSERT INTO journals (
    koperasi_id, 
    business_unit, 
    transaction_date, 
    description, 
    reference_id, 
    reference_type, 
    created_by
  ) VALUES (
    p_koperasi_id, 
    p_business_unit, 
    p_transaction_date, 
    p_description, 
    p_reference_id, 
    p_reference_type, 
    p_created_by
  ) RETURNING id INTO v_journal_id;

  -- 4. Insert Journal Lines (Now with Entity Tracking)
  INSERT INTO journal_lines (
    journal_id, 
    account_id, 
    debit, 
    credit, 
    description,
    entity_id,
    entity_type
  )
  SELECT 
    v_journal_id,
    (line->>'account_id')::UUID,
    (line->>'debit')::DECIMAL,
    (line->>'credit')::DECIMAL,
    COALESCE(line->>'description', p_description),
    (line->>'entity_id')::UUID,
    (line->>'entity_type')::VARCHAR
  FROM jsonb_array_elements(p_lines) AS line;

  RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
