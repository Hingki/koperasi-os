-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- Policy for Members (Own transactions)
CREATE POLICY "Users can view own transactions"
ON payment_transactions FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can insert own transactions"
ON payment_transactions FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Policy for Admins (All transactions in Koperasi)
-- Assuming user_metadata contains koperasi_id and role
CREATE POLICY "Admins can view all transactions in koperasi"
ON payment_transactions FOR SELECT
TO authenticated
USING (
  koperasi_id = (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'koperasi_id')::uuid
  AND 
  (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role') IN ('admin', 'manager', 'pengurus')
);

CREATE POLICY "Admins can update transactions"
ON payment_transactions FOR UPDATE
TO authenticated
USING (
  koperasi_id = (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'koperasi_id')::uuid
  AND 
  (current_setting('request.jwt.claims', true)::json->'user_metadata'->>'role') IN ('admin', 'manager', 'pengurus')
);
