-- Create DB roles and policies for admin and finance roles

-- Create roles at DB level (useful for service accounts)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'finance') THEN
    CREATE ROLE finance;
  END IF;
END$$;

-- Grants for admin & finance (table-level privileges; RLS still enforced)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.koperasi TO admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.koperasi TO finance;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chart_of_accounts TO admin;
GRANT SELECT, INSERT, UPDATE ON TABLE public.chart_of_accounts TO finance;

GRANT SELECT, INSERT, UPDATE ON TABLE public.ledger_entry TO admin;
GRANT SELECT, INSERT ON TABLE public.ledger_entry TO finance;

-- Policies using jwt.claims.role to allow admin/finance actions when JWT role is set

-- Admin full access to koperasi
DROP POLICY IF EXISTS "koperasi_admin_role" ON public.koperasi;
CREATE POLICY "koperasi_admin_role" ON public.koperasi
  FOR ALL TO public
  USING ( current_setting('jwt.claims.role', true) = 'admin' )
  WITH CHECK ( current_setting('jwt.claims.role', true) = 'admin' );

-- Finance role can manage chart_of_accounts; admin inherits
DROP POLICY IF EXISTS "coa_finance_dml" ON public.chart_of_accounts;
CREATE POLICY "coa_finance_dml" ON public.chart_of_accounts
  FOR ALL TO public
  USING ( current_setting('jwt.claims.role', true) IN ('finance','admin') )
  WITH CHECK ( current_setting('jwt.claims.role', true) IN ('finance','admin') );

-- Finance can insert ledger entries
DROP POLICY IF EXISTS "ledger_insert_finance" ON public.ledger_entry;
CREATE POLICY "ledger_insert_finance" ON public.ledger_entry
  FOR INSERT TO public
  WITH CHECK ( current_setting('jwt.claims.role', true) IN ('finance','admin') );

-- Admin can delete audit logs
DROP POLICY IF EXISTS "audit_delete_admin" ON public.audit_log;
CREATE POLICY "audit_delete_admin" ON public.audit_log
  FOR DELETE TO public
  USING ( current_setting('jwt.claims.role', true) = 'admin' );

-- Note: These policies depend on JWT claims being available (Supabase sets them).
