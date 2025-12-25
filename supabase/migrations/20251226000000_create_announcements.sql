-- Migration: Create Announcements Table
-- Description: Creates table for announcements and promos
-- Date: 2025-12-26

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    
    title TEXT NOT NULL,
    content TEXT, -- HTML or Markdown
    type TEXT NOT NULL DEFAULT 'announcement', -- 'announcement', 'promo'
    
    image_url TEXT, -- For promo banners
    
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ, -- Optional expiration
    
    is_active BOOLEAN DEFAULT true,
    
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_announcements_updated_at ON announcements;
CREATE TRIGGER handle_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Members can view active announcements
DROP POLICY IF EXISTS "Members can view active announcements" ON announcements;
CREATE POLICY "Members can view active announcements" 
    ON announcements FOR SELECT 
    TO authenticated 
    USING (is_active = true AND (end_date IS NULL OR end_date >= NOW()));

-- Admins (Pengelola) can manage all
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
CREATE POLICY "Admins can manage announcements" 
    ON announcements FOR ALL 
    TO authenticated 
    USING (
        koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid())
    );
