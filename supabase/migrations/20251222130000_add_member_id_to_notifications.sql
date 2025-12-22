-- Migration: Add member_id to notifications
-- Description: Ensures notifications table has member_id FK to member(id)
-- Date: 2025-12-22

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'notifications'
      AND column_name = 'member_id'
  ) THEN
    ALTER TABLE notifications
      ADD COLUMN member_id UUID REFERENCES member(id);
  END IF;
END
$$;

-- Index to speed up lookups by member
CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications(member_id);

-- Optional: unread by member index
CREATE INDEX IF NOT EXISTS idx_notifications_member_unread
  ON notifications(member_id)
  WHERE is_read = false;

