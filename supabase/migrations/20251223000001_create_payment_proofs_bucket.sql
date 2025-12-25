-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'payment-proofs', 
    'payment-proofs', 
    false,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

-- RLS Policies for storage.objects
-- Note: Supabase storage policies are often set on storage.objects

-- 1. Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'payment-proofs' );

-- 2. Allow authenticated users to view (MVP: open to auth users, ideally restricted to owner/admin)
DROP POLICY IF EXISTS "Authenticated users can view payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'payment-proofs' );
