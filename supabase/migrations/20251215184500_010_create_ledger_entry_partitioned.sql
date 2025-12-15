-- Create partitioned ledger_entry table and helper to ensure monthly partitions

CREATE TABLE IF NOT EXISTS ledger_entry (
  id UUID DEFAULT gen_random_uuid(),
  koperasi_id UUID NOT NULL REFERENCES koperasi(id),
  period_id UUID NOT NULL REFERENCES accounting_period(id),
  tx_id UUID NOT NULL,
  tx_type TEXT NOT NULL,
  tx_reference TEXT,
  account_debit TEXT NOT NULL REFERENCES chart_of_accounts(account_code),
  account_credit TEXT NOT NULL REFERENCES chart_of_accounts(account_code),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  source_table TEXT,
  source_id UUID,
  hash_current TEXT NOT NULL,
  hash_previous TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  book_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'posted' CHECK (status IN ('draft','posted','void')),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID NOT NULL,
  PRIMARY KEY (book_date, id)
) PARTITION BY RANGE (book_date);

-- Helper function: ensure monthly partition exists
CREATE OR REPLACE FUNCTION ensure_ledger_partition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  part_name TEXT;
BEGIN
  start_date := date_trunc('month', NEW.book_date)::date;
  end_date := (start_date + interval '1 month')::date;
  part_name := format('ledger_entry_%s', to_char(start_date, 'YYYYMM'));

  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = part_name) THEN
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF ledger_entry FOR VALUES FROM (%L) TO (%L)', part_name, start_date, end_date);
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to call partition creation on insert
DROP TRIGGER IF EXISTS trg_ensure_ledger_partition ON ledger_entry;
CREATE TRIGGER trg_ensure_ledger_partition
BEFORE INSERT ON ledger_entry
FOR EACH ROW EXECUTE FUNCTION ensure_ledger_partition();

-- Create an index to help queries by koperasi and book_date
CREATE INDEX IF NOT EXISTS idx_ledger_entry_koperasi_book_date ON ledger_entry (koperasi_id, book_date);

-- Create initial partition for current month
DO $$
BEGIN
  PERFORM ensure_ledger_partition_fn := 1;
  -- Manually create partition for current month if missing
  PERFORM (
    SELECT 1 FROM (
      SELECT date_trunc('month', CURRENT_DATE)::date AS start_date
    ) s
  );
  -- Use same logic as function
  EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF ledger_entry FOR VALUES FROM (%L) TO (%L)',
    format('ledger_entry_%s', to_char(date_trunc('month', CURRENT_DATE), 'YYYYMM')),
    date_trunc('month', CURRENT_DATE)::date,
    (date_trunc('month', CURRENT_DATE) + interval '1 month')::date
  );
END$$;
