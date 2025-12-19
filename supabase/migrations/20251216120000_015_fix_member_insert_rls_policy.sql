-- Fix Member INSERT RLS Policy - Security Fix
-- 
-- Problem: Previous policy allowed any authenticated user to insert member records
--          with any user_id (WITH CHECK ( true )), creating security vulnerability.
--
-- Solution: Enforce that users can ONLY insert member records where user_id = auth.uid()
--
-- Related: docs/security/member-rls-security-issue.md

-- Drop the permissive policy
DROP POLICY IF EXISTS "Enable insert for all authenticated users" ON public.member;

-- Create secure policy that enforces user_id = auth.uid()
CREATE POLICY "member_insert_own_profile" ON public.member
  FOR INSERT
  TO authenticated
  WITH CHECK ( auth.uid() = user_id );

-- Note: UPDATE policy is already correct (enforces user_id = auth.uid())
-- No changes needed for UPDATE policy

-- Verify RLS is still enabled
ALTER TABLE public.member ENABLE ROW LEVEL SECURITY;


