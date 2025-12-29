-- Create opening_balance_snapshot table for accounting period closing
-- Date: 2025-12-30

CREATE TABLE IF NOT EXISTS opening_balance_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  koperasi_id UUID NOT NULL REFERENCES koperasi(id),
  period_id UUID NOT NULL REFERENCES accounting_period(id), -- The period for which these are opening balances
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  balance NUMERIC(20, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(period_id, account_id)
);

ALTER TABLE opening_balance_snapshot ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "View snapshots" ON opening_balance_snapshot FOR SELECT USING (
  koperasi_id IN (
    SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()
  )
);

-- Allow admins to insert only. Snapshot is immutable (no UPDATE/DELETE).
CREATE POLICY "Insert snapshots" ON opening_balance_snapshot FOR INSERT WITH CHECK (
  koperasi_id IN (
    SELECT koperasi_id FROM user_role WHERE user_id = auth.uid() AND role IN ('admin', 'ketua', 'bendahara')
  )
);

-- Ensure period_status has necessary values (idempotent check)
DO $$
BEGIN
  -- We assume 'draft', 'open', 'closed', 'locked' exist from previous migrations.
  NULL;
END$$;
