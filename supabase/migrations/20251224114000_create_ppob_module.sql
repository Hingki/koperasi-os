-- PPOB Settings
CREATE TABLE IF NOT EXISTS ppob_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    admin_fee NUMERIC(12, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(koperasi_id)
);

ALTER TABLE ppob_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View PPOB Settings" ON ppob_settings;
CREATE POLICY "View PPOB Settings"
    ON ppob_settings FOR SELECT
    TO authenticated
    USING (koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Manage PPOB Settings" ON ppob_settings;
CREATE POLICY "Manage PPOB Settings"
    ON ppob_settings FOR UPDATE
    TO authenticated
    USING (koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Insert PPOB Settings" ON ppob_settings;
CREATE POLICY "Insert PPOB Settings"
    ON ppob_settings FOR INSERT
    TO authenticated
    WITH CHECK (koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, UPDATE ON ppob_settings TO authenticated;
GRANT ALL ON ppob_settings TO service_role;

-- PPOB Transactions
CREATE TABLE IF NOT EXISTS ppob_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    member_id UUID REFERENCES member(id),
    account_id UUID REFERENCES savings_accounts(id),
    category TEXT NOT NULL CHECK (category IN ('pulsa','data','listrik','pdam')),
    provider TEXT,
    product_id TEXT,
    product_name TEXT,
    customer_number TEXT,
    price NUMERIC(12,2) NOT NULL,
    admin_fee NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL,
    status TEXT DEFAULT 'success',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

ALTER TABLE ppob_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View Own PPOB Transactions" ON ppob_transactions;
CREATE POLICY "View Own PPOB Transactions"
    ON ppob_transactions FOR SELECT
    TO authenticated
    USING (member_id IN (SELECT id FROM member WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Insert PPOB Transactions" ON ppob_transactions;
CREATE POLICY "Insert PPOB Transactions"
    ON ppob_transactions FOR INSERT
    TO authenticated
    WITH CHECK (member_id IN (SELECT id FROM member WHERE user_id = auth.uid()));

GRANT SELECT, INSERT ON ppob_transactions TO authenticated;
GRANT ALL ON ppob_transactions TO service_role;
