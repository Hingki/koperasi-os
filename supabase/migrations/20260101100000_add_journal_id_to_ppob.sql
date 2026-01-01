
ALTER TABLE ppob_transactions 
ADD COLUMN IF NOT EXISTS journal_id UUID REFERENCES ledger_journals(id);
