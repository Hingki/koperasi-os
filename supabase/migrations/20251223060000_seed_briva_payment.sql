-- Migration: Seed BRIVA Payment Source
-- Description: Adds BRIVA as a payment source option
-- Date: 2025-12-23

INSERT INTO payment_sources (
    koperasi_id,
    name,
    method,
    provider,
    bank_name,
    account_number,
    account_holder,
    is_active,
    created_by
)
SELECT
    k.id,
    'BRIVA (BRI Virtual Account)',
    'va',
    'manual', -- Using manual for now to allow proof upload
    'BRI',
    '8888000012345678', -- Mock VA Number
    'Koperasi Sejahtera',
    true,
    (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
FROM koperasi k
WHERE NOT EXISTS (
    SELECT 1 FROM payment_sources ps 
    WHERE ps.koperasi_id = k.id 
    AND ps.name = 'BRIVA (BRI Virtual Account)'
);
