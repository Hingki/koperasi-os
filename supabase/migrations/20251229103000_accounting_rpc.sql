-- Migration: Accounting Periods and Journal RPC
-- Date: 2025-12-29

-- 1. Accounting Periods Table
CREATE TABLE IF NOT EXISTS accounting_periods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    koperasi_id UUID NOT NULL,
    name VARCHAR(50) NOT NULL, -- e.g., "Januari 2024"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed BOOLEAN DEFAULT false,
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_period_per_koperasi UNIQUE (koperasi_id, start_date, end_date),
    CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- Index for period lookup
CREATE INDEX IF NOT EXISTS idx_periods_koperasi_date ON accounting_periods(koperasi_id, start_date, end_date);

-- Enable RLS
ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "View periods" ON accounting_periods;
CREATE POLICY "View periods" ON accounting_periods FOR SELECT 
USING (koperasi_id IN (
    SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "Manage periods" ON accounting_periods;
CREATE POLICY "Manage periods" ON accounting_periods FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM user_role 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'bendahara')
        AND koperasi_id = accounting_periods.koperasi_id
    )
);

-- 2. RPC Function: post_journal_entry
-- Guarantees atomicity (All or Nothing) and Double-Entry Validation
CREATE OR REPLACE FUNCTION post_journal_entry(
  p_koperasi_id UUID,
  p_business_unit VARCHAR,
  p_transaction_date DATE,
  p_description TEXT,
  p_reference_id VARCHAR,
  p_reference_type VARCHAR,
  p_lines JSONB, -- Array of objects: {account_id, debit, credit, description}
  p_created_by UUID
) RETURNS UUID AS $$
DECLARE
  v_journal_id UUID;
  v_total_debit DECIMAL(20, 2) := 0;
  v_total_credit DECIMAL(20, 2) := 0;
  v_is_period_closed BOOLEAN;
BEGIN
  -- 1. Period Lock Awareness Check
  SELECT EXISTS (
    SELECT 1 FROM accounting_periods 
    WHERE koperasi_id = p_koperasi_id 
    AND p_transaction_date BETWEEN start_date AND end_date 
    AND is_closed = true
  ) INTO v_is_period_closed;
  
  IF v_is_period_closed THEN
    RAISE EXCEPTION 'Accounting period for date % is closed. Transaction rejected.', p_transaction_date;
  END IF;

  -- 2. Double-Entry Validation (Debit = Credit)
  SELECT 
    COALESCE(SUM((line->>'debit')::DECIMAL), 0),
    COALESCE(SUM((line->>'credit')::DECIMAL), 0)
  INTO v_total_debit, v_total_credit
  FROM jsonb_array_elements(p_lines) AS line;
  
  -- Allow small floating point difference (optional, but strict equality is safer for currency)
  IF v_total_debit <> v_total_credit THEN
    RAISE EXCEPTION 'Journal entry is not balanced. Debit: %, Credit: %', v_total_debit, v_total_credit;
  END IF;

  IF v_total_debit = 0 THEN
     RAISE EXCEPTION 'Journal entry must have non-zero value.';
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

  -- 4. Insert Journal Lines
  INSERT INTO journal_lines (
    journal_id, 
    account_id, 
    debit, 
    credit, 
    description
  )
  SELECT 
    v_journal_id,
    (line->>'account_id')::UUID,
    (line->>'debit')::DECIMAL,
    (line->>'credit')::DECIMAL,
    COALESCE(line->>'description', p_description)
  FROM jsonb_array_elements(p_lines) AS line;

  RETURN v_journal_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
