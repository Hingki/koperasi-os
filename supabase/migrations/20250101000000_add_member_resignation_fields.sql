-- Add resignation fields to member table
ALTER TABLE member ADD COLUMN IF NOT EXISTS resigned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE member ADD COLUMN IF NOT EXISTS resignation_reason TEXT;

-- Add closed_at to savings_accounts
ALTER TABLE savings_accounts ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- Add 'resigned' to member_status enum if it doesn't exist
-- Note: 'ALTER TYPE ... ADD VALUE' cannot be run inside a transaction block usually, 
-- but we put it here. If it fails, it needs to be run separately.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid  
                   WHERE t.typname = 'member_status' AND e.enumlabel = 'resigned') THEN
        ALTER TYPE member_status ADD VALUE 'resigned';
    END IF;
END$$;
