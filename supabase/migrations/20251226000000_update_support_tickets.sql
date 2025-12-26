-- Add screenshot_url column if not exists
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Update category enum values if ticket_category type exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_category') THEN
        ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'ui_ux';
        ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'bug';
        ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'feature_request';
    END IF;
END$$;

-- Create storage bucket for support attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('support-attachments', 'support-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on objects if not already
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to support-attachments
CREATE POLICY "Public Access Support Attachments"
ON storage.objects FOR SELECT
USING ( bucket_id = 'support-attachments' );

-- Allow authenticated users to upload to support-attachments
CREATE POLICY "Authenticated Upload Support Attachments"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'support-attachments' AND auth.role() = 'authenticated' );
