ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS payment_source_id UUID REFERENCES payment_sources(id);
