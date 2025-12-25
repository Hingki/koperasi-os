-- Fix RLS on payment_transactions to avoid insecure user_metadata references
-- Replace policies to use has_permission() based on user_role mapping
-- Idempotent: drop old policies if they exist, then recreate safe ones

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop potentially insecure or overlapping policies
DROP POLICY IF EXISTS "View Payment Transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Insert Payment Transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Update Payment Transactions" ON public.payment_transactions;

DROP POLICY IF EXISTS "Users can view own transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Admins can view all transactions in koperasi" ON public.payment_transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON public.payment_transactions;

-- Recreate safe policies
CREATE POLICY "Users can view own transactions"
ON public.payment_transactions FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can insert own transactions"
ON public.payment_transactions FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Koperasi admins can view transactions"
ON public.payment_transactions FOR SELECT
TO authenticated
USING (
  public.has_permission(payment_transactions.koperasi_id, ARRAY['admin','pengurus','ketua','bendahara']::user_role_type[])
);

CREATE POLICY "Koperasi admins can update transactions"
ON public.payment_transactions FOR UPDATE
TO authenticated
USING (
  public.has_permission(payment_transactions.koperasi_id, ARRAY['admin','pengurus','ketua','bendahara']::user_role_type[])
)
WITH CHECK (
  public.has_permission(payment_transactions.koperasi_id, ARRAY['admin','pengurus','ketua','bendahara']::user_role_type[])
);
