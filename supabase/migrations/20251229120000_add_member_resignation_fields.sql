-- Add resignation fields to member table
ALTER TABLE member 
ADD COLUMN IF NOT EXISTS resigned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS resignation_reason TEXT,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Ensure status enum has 'resigned'
ALTER TYPE member_status ADD VALUE IF NOT EXISTS 'resigned';
