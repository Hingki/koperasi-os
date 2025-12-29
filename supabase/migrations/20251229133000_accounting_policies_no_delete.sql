-- Enforce SAK-EP rules: No delete journals, period locking respected via RPC
-- This migration adjusts RLS policies to disallow DELETE on journals and journal_lines

-- Journals: remove broad ALL policy and split by command, no DELETE policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Manage journals" ON journals;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Insert journals" ON journals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_role 
      WHERE user_id = auth.uid() 
        AND role IN ('admin','bendahara','staff','teller')
        AND koperasi_id = journals.koperasi_id
    )
  );

CREATE POLICY "Update journals" ON journals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_role 
      WHERE user_id = auth.uid() 
        AND role IN ('admin','bendahara','staff','teller')
        AND koperasi_id = journals.koperasi_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_role 
      WHERE user_id = auth.uid() 
        AND role IN ('admin','bendahara','staff','teller')
        AND koperasi_id = journals.koperasi_id
    )
  );

-- Journal Lines: remove broad ALL policy and split by command, no DELETE policy
DO $$ BEGIN
  DROP POLICY IF EXISTS "Manage journal lines" ON journal_lines;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY "Insert journal lines" ON journal_lines
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM journals j
      JOIN user_role ur ON ur.koperasi_id = j.koperasi_id
      WHERE j.id = journal_lines.journal_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('admin','bendahara','staff','teller')
    )
  );

CREATE POLICY "Update journal lines" ON journal_lines
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM journals j
      JOIN user_role ur ON ur.koperasi_id = j.koperasi_id
      WHERE j.id = journal_lines.journal_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('admin','bendahara','staff','teller')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM journals j
      JOIN user_role ur ON ur.koperasi_id = j.koperasi_id
      WHERE j.id = journal_lines.journal_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('admin','bendahara','staff','teller')
    )
  );

-- Optional hard guardrails: deny DELETE even for superusers via restrictive policy
-- Note: With RLS enabled and no DELETE policy, deletes are denied by default.

