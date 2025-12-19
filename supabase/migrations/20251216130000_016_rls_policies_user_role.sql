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
DROP POLICY IF EXISTS "user_role_select_admin" ON public.user_role;
CREATE POLICY "user_role_select_admin" ON public.user_role
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.koperasi_id = user_role.koperasi_id
      AND ur.is_active = true
      AND ur.deleted_at IS NULL
    )
  );

-- Policy 3: Only admins can insert new roles
DROP POLICY IF EXISTS "user_role_insert_admin" ON public.user_role;
CREATE POLICY "user_role_insert_admin" ON public.user_role
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.koperasi_id = user_role.koperasi_id
      AND ur.is_active = true
      AND ur.deleted_at IS NULL
    )
  );

-- Policy 4: Only admins can update roles
DROP POLICY IF EXISTS "user_role_update_admin" ON public.user_role;
CREATE POLICY "user_role_update_admin" ON public.user_role
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.koperasi_id = user_role.koperasi_id
      AND ur.is_active = true
      AND ur.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.koperasi_id = user_role.koperasi_id
      AND ur.is_active = true
      AND ur.deleted_at IS NULL
    )
  );

-- Policy 5: Only admins can delete (soft delete) roles
DROP POLICY IF EXISTS "user_role_delete_admin" ON public.user_role;
CREATE POLICY "user_role_delete_admin" ON public.user_role
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role ur
      WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.koperasi_id = user_role.koperasi_id
      AND ur.is_active = true
      AND ur.deleted_at IS NULL
    )
  );

-- Note: Soft delete is preferred (set deleted_at) over hard delete
-- This policy allows DELETE but application should use UPDATE to set deleted_at


