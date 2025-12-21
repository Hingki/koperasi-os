-- RLS Policies for user_role table
-- 
-- Security model:
-- - Users can see their own roles
-- - Admins can see all roles in their koperasi
-- - Only admins can assign/modify roles
-- - Users cannot modify their own roles

-- Enable RLS on user_role table
ALTER TABLE public.user_role ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.user_role TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Policy 1: Users can see their own roles
DROP POLICY IF EXISTS "user_role_select_own" ON public.user_role;
CREATE POLICY "user_role_select_own" ON public.user_role
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 2: Admins can see all roles in their koperasi
-- This allows admins to manage roles for all users in their koperasi
-- FIXED: Use auth.jwt() metadata or a separate lookup to avoid recursion
DROP POLICY IF EXISTS "user_role_select_admin" ON public.user_role;
CREATE POLICY "user_role_select_admin" ON public.user_role
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
        -- Select directly from the table, but bypass RLS using SECURITY DEFINER function or careful logic
        -- To avoid recursion, we check if the CURRENT user has admin role in the target koperasi
        -- But we cannot select from user_role within user_role policy without recursion
        -- UNLESS we are careful.
        
        -- Strategy: Use a simplified check or trust the token claims if available.
        -- Better Strategy for Postgres RLS recursion:
        -- Break the recursion by NOT joining user_role to itself in the same query context
        -- OR ensure the inner query is efficient and doesn't trigger the policy again in a loop.
        
        -- Actually, the recursion happens because "SELECT 1 FROM user_role" triggers "user_role_select_admin" again.
        -- We can fix this by creating a separate secure view or function, OR by checking a different table.
        -- But for now, let's just use a direct check that avoids the policy for the admin check itself?
        -- No, RLS applies to all rows.
        
        -- FIX: Split the policy.
        -- 1. Users see their OWN roles (already done)
        -- 2. Admins see OTHER roles.
        
        -- To properly fix recursion, we need to allow the lookup of the admin's OWN role without triggering the "admin check" policy.
        -- The "user_role_select_own" policy handles the lookup of the admin's own role.
        -- So if we structure the query correctly, it might work.
        
        -- However, the safest way in Supabase/Postgres to avoid this common pitfall is to use a "security definer" function
        -- to check permissions, or use JWT claims.
        -- Let's use a standard approach:
        
        SELECT 1 FROM public.user_role admin_ur
        WHERE admin_ur.user_id = auth.uid()
        AND admin_ur.role = 'admin'
        AND admin_ur.koperasi_id = user_role.koperasi_id
        -- CRITICAL: This inner query MUST be satisfiable by "user_role_select_own"
        -- "user_role_select_own" allows selecting where user_id = auth.uid()
        -- So this Inner Query is valid for the current user.
        -- The recursion happens if the DB tries to apply "user_role_select_admin" to this inner query.
        -- Postgres is usually smart enough IF the policies are mutually exclusive or ordered? No.
        
        -- The recursion error means Postgres can't prove it won't loop.
        -- We will use a workaround: View or Function.
        -- Or simply rely on "user_role_select_own" for the admin to find themselves,
        -- but we need to ensure the policy definitions don't overlap in a way that causes a loop.
        
        -- ACTUALLY, the issue is that "user_role_select_admin" is applied to the scan of "admin_ur".
        -- We need to ensure that the scan of "admin_ur" matches "user_role_select_own".
    )
  );
  
-- RE-WRITE to avoid recursion:
-- We will define a helper function to check permissions that bypasses RLS
CREATE OR REPLACE FUNCTION public.has_permission(target_koperasi_id UUID, required_roles user_role_type[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin), bypassing RLS
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_role
    WHERE user_id = auth.uid()
    AND role = ANY(required_roles)
    AND koperasi_id = target_koperasi_id
    AND is_active = true
    AND deleted_at IS NULL
  );
$$;

-- Helper for just admin check (legacy/convenience)
CREATE OR REPLACE FUNCTION public.is_admin_of_koperasi(target_koperasi_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT public.has_permission(target_koperasi_id, ARRAY['admin']::user_role_type[]);
$$;

DROP POLICY IF EXISTS "user_role_select_admin" ON public.user_role;
CREATE POLICY "user_role_select_admin" ON public.user_role
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_of_koperasi(koperasi_id)
  );

-- Policy 3: Only admins can insert new roles
DROP POLICY IF EXISTS "user_role_insert_admin" ON public.user_role;
CREATE POLICY "user_role_insert_admin" ON public.user_role
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin_of_koperasi(koperasi_id)
  );

-- Policy 4: Only admins can update roles
DROP POLICY IF EXISTS "user_role_update_admin" ON public.user_role;
CREATE POLICY "user_role_update_admin" ON public.user_role
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_of_koperasi(koperasi_id)
  )
  WITH CHECK (
    public.is_admin_of_koperasi(koperasi_id)
  );

-- Policy 5: Only admins can delete (soft delete) roles
DROP POLICY IF EXISTS "user_role_delete_admin" ON public.user_role;
CREATE POLICY "user_role_delete_admin" ON public.user_role
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin_of_koperasi(koperasi_id)
  );

-- Note: Soft delete is preferred (set deleted_at) over hard delete
-- This policy allows DELETE but application should use UPDATE to set deleted_at



