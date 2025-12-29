-- Ensure enum exists
DO $$ BEGIN
    CREATE TYPE financing_category AS ENUM ('murabahah', 'mudharabah', 'musyarakah', 'qardh');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Fix missing columns for Financing Module
ALTER TABLE loan_products 
ADD COLUMN IF NOT EXISTS is_financing BOOLEAN DEFAULT false;

-- Add financing_category column separately to handle dependency
ALTER TABLE loan_products
ADD COLUMN IF NOT EXISTS financing_category financing_category;
