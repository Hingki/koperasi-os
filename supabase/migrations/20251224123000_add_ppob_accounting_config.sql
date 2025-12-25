
-- Add Accounting Configuration columns to ppob_settings
ALTER TABLE ppob_settings
ADD COLUMN IF NOT EXISTS deposit_account_code VARCHAR(50) DEFAULT '1-1501', -- Default: PPOB Deposit
ADD COLUMN IF NOT EXISTS revenue_account_code VARCHAR(50) DEFAULT '4-1002'; -- Default: Admin Fee Income

-- Update existing rows if any
UPDATE ppob_settings 
SET 
  deposit_account_code = '1-1501',
  revenue_account_code = '4-1002'
WHERE deposit_account_code IS NULL;
