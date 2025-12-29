-- Create system_logs table for operational observability (Pilot Phase)
-- Designed to be non-intrusive and separate from core accounting audit trails

CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    action_type TEXT NOT NULL, -- 'SIMPANAN', 'POS', 'PINJAMAN', 'TUTUP_BUKU', etc.
    action_detail TEXT NOT NULL, -- 'SETOR', 'TARIK', 'PENGAJUAN', etc.
    user_id UUID, -- UUID of the user performing the action (nullable for system actions)
    user_role TEXT, -- Role of the user at the time of action
    entity_id TEXT, -- ID of the entity being acted upon (member_id, loan_id, etc.)
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILURE', 'WARNING')),
    metadata JSONB DEFAULT '{}'::jsonb, -- Flexible storage for details (amount, error message, etc.)
    ip_address TEXT,
    user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Policies

-- Allow all authenticated users to insert logs (logging should never fail due to permissions)
CREATE POLICY "Enable insert for authenticated users" ON public.system_logs
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow admins and pengurus to view logs
CREATE POLICY "Enable read for admins and pengurus" ON public.system_logs
    FOR SELECT TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'pengurus', 'manager') OR
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role IN ('admin', 'pengurus', 'manager')
        )
    );

-- Create index for faster filtering
CREATE INDEX idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX idx_system_logs_action_type ON public.system_logs(action_type);
CREATE INDEX idx_system_logs_status ON public.system_logs(status);

-- Grant permissions
GRANT ALL ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;
