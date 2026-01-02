-- Migration: Add specific Vice Chairman roles
-- Date: 2026-01-02
-- Description: Adds 'wakil_ketua_usaha' and 'wakil_ketua_keanggotaan' to user_role_type enum.

ALTER TYPE user_role_type ADD VALUE IF NOT EXISTS 'wakil_ketua_usaha';
ALTER TYPE user_role_type ADD VALUE IF NOT EXISTS 'wakil_ketua_keanggotaan';
