-- Fix "Function Search Path Mutable" security warnings by setting search_path explicitly

-- 1. get_ledger_balance_summary
ALTER FUNCTION public.get_ledger_balance_summary(uuid, date) SET search_path = public;

-- 2. generate_nomor_anggota
ALTER FUNCTION public.generate_nomor_anggota() SET search_path = public;

-- 3. handle_updated_at
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

-- 4. fn_audit_log
ALTER FUNCTION public.fn_audit_log() SET search_path = public;

-- 5. ensure_ledger_partition
ALTER FUNCTION public.ensure_ledger_partition() SET search_path = public;

-- 6. has_permission
ALTER FUNCTION public.has_permission(uuid, user_role_type[]) SET search_path = public;

-- 7. is_admin_of_koperasi
ALTER FUNCTION public.is_admin_of_koperasi(uuid) SET search_path = public;
