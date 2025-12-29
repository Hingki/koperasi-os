-- 2025-12-29: Lock Journal Immutability (No UPDATE/DELETE)

-- Drop permissive policies
DROP POLICY IF EXISTS "Manage journals" ON journals;
DROP POLICY IF EXISTS "Manage journal lines" ON journal_lines;

-- Re-create SELECT policies
DROP POLICY IF EXISTS "View journals" ON journals;
CREATE POLICY "View journals" ON journals FOR SELECT 
USING (koperasi_id IN (
    SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()
));

DROP POLICY IF EXISTS "View journal lines" ON journal_lines;
CREATE POLICY "View journal lines" ON journal_lines FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM journals j
        WHERE j.id = journal_lines.journal_id
        AND j.koperasi_id IN (
            SELECT koperasi_id FROM user_role WHERE user_id = auth.uid()
        )
    )
);

-- Insert-only policies (no UPDATE/DELETE)
DROP POLICY IF EXISTS "Insert journals" ON journals;
CREATE POLICY "Insert journals" ON journals FOR INSERT
USING (
    EXISTS (
        SELECT 1 FROM user_role 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'bendahara', 'staff', 'teller')
        AND koperasi_id = journals.koperasi_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_role 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'bendahara', 'staff', 'teller')
        AND koperasi_id = journals.koperasi_id
    )
);

DROP POLICY IF EXISTS "Insert journal lines" ON journal_lines;
CREATE POLICY "Insert journal lines" ON journal_lines FOR INSERT
USING (
    EXISTS (
        SELECT 1 FROM journals j
        JOIN user_role ur ON ur.koperasi_id = j.koperasi_id
        WHERE j.id = journal_lines.journal_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'bendahara', 'staff', 'teller')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM journals j
        JOIN user_role ur ON ur.koperasi_id = j.koperasi_id
        WHERE j.id = journal_lines.journal_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'bendahara', 'staff', 'teller')
    )
);

-- Note: post_journal_entry runs as SECURITY DEFINER and bypasses RLS for inserts
-- No UPDATE or DELETE policies are defined, effectively locking journal immutability.

