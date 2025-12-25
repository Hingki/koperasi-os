ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_source_id UUID;

ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_payment_source_id_fkey;
ALTER TABLE payment_transactions ADD CONSTRAINT payment_transactions_payment_source_id_fkey FOREIGN KEY (payment_source_id) REFERENCES payment_sources(id);
