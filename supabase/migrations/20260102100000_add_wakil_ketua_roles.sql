-- Migration: Add specialized vice chairman roles and update RLS
-- Date: 2026-01-02

-- 1. Add new roles to user_role_type enum
ALTER TYPE user_role_type ADD VALUE IF NOT EXISTS 'wakil_ketua_usaha';
ALTER TYPE user_role_type ADD VALUE IF NOT EXISTS 'wakil_ketua_keanggotaan';

-- 2. Update Loans Policy to include wakil_ketua_usaha
-- Loans are business related
DROP POLICY IF EXISTS "Admins can manage loans" ON loans;
CREATE POLICY "Admins can manage loans"
    ON loans FOR ALL
    TO authenticated
    USING (
        public.has_permission(koperasi_id, ARRAY['admin', 'pengurus', 'ketua', 'bendahara', 'wakil_ketua_usaha']::user_role_type[])
    )
    WITH CHECK (
        public.has_permission(koperasi_id, ARRAY['admin', 'pengurus', 'ketua', 'bendahara', 'wakil_ketua_usaha']::user_role_type[])
    );

-- 3. Update Members Policy to include wakil_ketua_keanggotaan
-- Note: Check existing member policies first. Usually 'admin', 'pengurus', 'staff' have access.
-- We'll add specialized roles.

DROP POLICY IF EXISTS "Admins and Staff can manage members" ON member;
CREATE POLICY "Admins and Staff can manage members"
    ON member FOR ALL
    TO authenticated
    USING (
        public.has_permission(koperasi_id, ARRAY['admin', 'pengurus', 'ketua', 'sekretaris', 'staff', 'wakil_ketua_keanggotaan']::user_role_type[])
    )
    WITH CHECK (
        public.has_permission(koperasi_id, ARRAY['admin', 'pengurus', 'ketua', 'sekretaris', 'staff', 'wakil_ketua_keanggotaan']::user_role_type[])
    );
