-- Ensure account_code is unique on chart_of_accounts so it can be referenced
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'chart_of_accounts' AND c.contype = 'u'
    AND EXISTS (
      SELECT 1 FROM pg_attribute a WHERE a.attrelid = t.oid AND a.attname = 'account_code'
    )
  ) THEN
    ALTER TABLE chart_of_accounts ADD CONSTRAINT chart_of_accounts_account_code_unique UNIQUE (account_code);
  END IF;
END$$;
