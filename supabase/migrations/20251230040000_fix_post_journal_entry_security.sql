-- Fix security issue: mutable search_path in post_journal_entry
-- Date: 2025-12-30

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
  v_period_exists BOOLEAN;
BEGIN
  -- 1. Period Lock Awareness Check
  -- Check against 'accounting_period' (singular) which is the active table
  SELECT 
    EXISTS (
      SELECT 1 FROM accounting_period 
      WHERE koperasi_id = p_koperasi_id 
      AND p_transaction_date BETWEEN start_date AND end_date 
      AND status = 'closed' -- status is text enum: 'draft', 'open', 'closed'
    ),
    EXISTS (
      SELECT 1 FROM accounting_period
      WHERE koperasi_id = p_koperasi_id
      AND p_transaction_date BETWEEN start_date AND end_date
    )
  INTO v_is_period_closed, v_period_exists;
  
  -- Strict Rule: Transaction MUST fall into a defined period? 
  -- Constitution says: "Setiap jurnal HARUS berada dalam accounting_period yang OPEN."
  -- So if no period exists, it is NOT OPEN. -> REJECT.
  
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
  
  -- Allow small floating point difference
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
