-- Migration: Make Member Number Nullable for Pending State
-- Date: 2026-01-02
-- Description: Allows members to be in 'pending' state without a member number.

ALTER TABLE public.member 
ALTER COLUMN nomor_anggota DROP NOT NULL;
