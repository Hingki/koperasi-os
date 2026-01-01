
-- Create marketplace_transactions table
CREATE TABLE IF NOT EXISTS marketplace_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('retail', 'ppob')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('initiated', 'journal_locked', 'fulfilled', 'settled', 'reversed')),
    journal_id UUID NOT NULL REFERENCES ledger_journals(id),
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('retail', 'ppob')),
    entity_id UUID NOT NULL,
    amount NUMERIC(20, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    fulfilled_at TIMESTAMP WITH TIME ZONE,
    settled_at TIMESTAMP WITH TIME ZONE,
    reversed_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional metadata
    koperasi_id UUID NOT NULL,
    created_by UUID
);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_status ON marketplace_transactions(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_transactions_created_at ON marketplace_transactions(created_at);

-- RLS
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users based on koperasi_id" ON marketplace_transactions
    FOR SELECT
    USING (auth.uid() IN (
        SELECT user_id FROM member WHERE koperasi_id = marketplace_transactions.koperasi_id
    ));

CREATE POLICY "Enable insert access for authenticated users based on koperasi_id" ON marketplace_transactions
    FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT user_id FROM member WHERE koperasi_id = marketplace_transactions.koperasi_id
    ));

CREATE POLICY "Enable update access for authenticated users based on koperasi_id" ON marketplace_transactions
    FOR UPDATE
    USING (auth.uid() IN (
        SELECT user_id FROM member WHERE koperasi_id = marketplace_transactions.koperasi_id
    ));
