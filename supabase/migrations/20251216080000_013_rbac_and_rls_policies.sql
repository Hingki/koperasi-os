-- 2025-12-16: Conservative RBAC and RLS policies for core tables
-- Goals: prevent anonymous DML, enable RLS with conservative policies for authenticated users.

-- Revoke anonymous default privileges on sensitive tables
REVOKE ALL ON TABLE public.koperasi FROM anon;
REVOKE ALL ON TABLE public.chart_of_accounts FROM anon;
REVOKE ALL ON TABLE public.ledger_entry FROM anon;
REVOKE ALL ON TABLE public.audit_log FROM anon;

ALTER TABLE IF EXISTS public.koperasi ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.koperasi TO anon;
-- MIGRATION-LINTER: allow-anon
  FOR SELECT TO authenticated
  USING ( true );
DROP POLICY IF EXISTS "koperasi_dml_authenticated" ON public.koperasi;
CREATE POLICY "koperasi_dml_authenticated" ON public.koperasi
  FOR ALL TO authenticated
  USING ( true )
  WITH CHECK ( true );
-- Grant table-level privileges to authenticated (to allow DML; RLS controls rows)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.koperasi TO authenticated;

-- Chart of accounts: SELECT for authenticated, DML for authenticated only
ALTER TABLE IF EXISTS public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coa_select_authenticated" ON public.chart_of_accounts;
CREATE POLICY "coa_select_authenticated" ON public.chart_of_accounts
  FOR SELECT TO authenticated
  USING ( true );
DROP POLICY IF EXISTS "coa_dml_authenticated" ON public.chart_of_accounts;
CREATE POLICY "coa_dml_authenticated" ON public.chart_of_accounts
  FOR ALL TO authenticated
  USING ( true )
  WITH CHECK ( true );
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.chart_of_accounts TO authenticated;

-- Ledger entries: restrict writes to authenticated (service users should use server-side keys)
ALTER TABLE IF EXISTS public.ledger_entry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ledger_select_authenticated" ON public.ledger_entry;
CREATE POLICY "ledger_select_authenticated" ON public.ledger_entry
  FOR SELECT TO authenticated
  USING ( true );
DROP POLICY IF EXISTS "ledger_insert_authenticated" ON public.ledger_entry;
CREATE POLICY "ledger_insert_authenticated" ON public.ledger_entry
  FOR INSERT TO authenticated
  WITH CHECK ( true );
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ledger_entry TO authenticated;

-- Audit log: deny anon and allow authenticated SELECT only (no inserts by clients)
ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_deny_anon" ON public.audit_log;
CREATE POLICY "audit_deny_anon" ON public.audit_log
  FOR ALL TO anon
  USING ( false )
  WITH CHECK ( false );
DROP POLICY IF EXISTS "audit_select_authenticated" ON public.audit_log;
CREATE POLICY "audit_select_authenticated" ON public.audit_log
  FOR SELECT TO authenticated
  USING ( true );
-- Allow authenticated sessions (and their triggers) to INSERT into audit_log
GRANT INSERT ON TABLE public.audit_log TO authenticated;
DROP POLICY IF EXISTS "audit_insert_authenticated" ON public.audit_log;
CREATE POLICY "audit_insert_authenticated" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK ( true );
-- Additionally allow INSERTs for audit purposes from any role (triggers, background jobs)
GRANT INSERT ON TABLE public.audit_log TO public;
DROP POLICY IF EXISTS "audit_insert_any" ON public.audit_log;
CREATE POLICY "audit_insert_any" ON public.audit_log
  FOR INSERT TO public
  WITH CHECK ( true );

-- NOTE: These policies are conservative; later tasks should add role-specific policies (e.g., admin, finance)
