DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'notifications'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications'
      AND column_name = 'member_id'
  ) THEN
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
    CREATE POLICY "Members can view their own notifications"
      ON notifications FOR SELECT TO authenticated
      USING (member_id IN (SELECT id FROM member WHERE user_id = auth.uid()));
    CREATE POLICY "Members can update their own notifications"
      ON notifications FOR UPDATE TO authenticated
      USING (member_id IN (SELECT id FROM member WHERE user_id = auth.uid()))
      WITH CHECK (member_id IN (SELECT id FROM member WHERE user_id = auth.uid()));
  END IF;
END
$$;
