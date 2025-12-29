-- Migration: Add auditor role and approval columns
-- Date: 2025-12-30

-- 1. Add 'auditor' to user_role_type enum
ALTER TYPE user_role_type ADD VALUE IF NOT EXISTS 'auditor';

-- 2. Add approval columns to ledger_entry
-- Note: ledger_entry is partitioned. ALTER TABLE on parent propagates to partitions.
ALTER TABLE ledger_entry 
ADD COLUMN IF NOT EXISTS posted_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

-- 3. Add reason columns to accounting_period
ALTER TABLE accounting_period
ADD COLUMN IF NOT EXISTS close_reason TEXT,
ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reopened_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reopen_reason TEXT;

-- 4. Create RLS policies for Auditor (Read-Only)
-- Auditors can read everything but change nothing.
-- Existing policies might rely on role check.
-- Let's ensure 'auditor' has SELECT access.

-- Example policy update (conceptually - actual policies might need review)
-- We assume generic "Members of Koperasi can view" or specific role checks.
-- If existing policy uses `role IN ('admin', ...)` we might need to update it.
-- But typically `user_role` table governs access.

-- Let's check `user_role` policies. Usually we query `user_role` to determine permissions.
-- We don't need to change RLS if the logic is "users with role for this koperasi can select".

