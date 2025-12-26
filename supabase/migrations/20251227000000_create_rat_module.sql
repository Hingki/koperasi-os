-- Migration: Create RAT (Rapat Anggota Tahunan) Module
-- Description: Tables for managing Electronic Annual Member Meetings (sessions, attendance, agendas, voting)
-- Date: 2025-12-27

-- 1. Create Enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rat_status') THEN
    CREATE TYPE rat_status AS ENUM ('draft', 'scheduled', 'ongoing', 'completed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rat_agenda_status') THEN
    CREATE TYPE rat_agenda_status AS ENUM ('pending', 'active', 'completed');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rat_attendance_status') THEN
    CREATE TYPE rat_attendance_status AS ENUM ('registered', 'present', 'absent', 'excused');
  END IF;
END$$;

-- 2. RAT Sessions Table
CREATE TABLE IF NOT EXISTS rat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    
    title TEXT NOT NULL,
    description TEXT,
    fiscal_year INTEGER NOT NULL, -- Tahun Buku yang dibahas
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    
    status rat_status DEFAULT 'draft',
    location TEXT, -- Could be "Online" or physical address
    meeting_link TEXT, -- Zoom/Meet link
    
    documents JSONB DEFAULT '[]'::jsonb, -- Array of {name, url, type}
    
    quorum_min_percent NUMERIC(5,2) DEFAULT 50.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 3. RAT Attendance Table
CREATE TABLE IF NOT EXISTS rat_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rat_session_id UUID NOT NULL REFERENCES rat_sessions(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES member(id),
    
    status rat_attendance_status DEFAULT 'registered',
    check_in_time TIMESTAMPTZ,
    ip_address TEXT,
    device_info TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(rat_session_id, member_id)
);

-- 4. RAT Agendas Table
CREATE TABLE IF NOT EXISTS rat_agendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rat_session_id UUID NOT NULL REFERENCES rat_sessions(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    
    is_voting_required BOOLEAN DEFAULT false,
    voting_options JSONB DEFAULT '["Setuju", "Tidak Setuju", "Abstain"]'::jsonb,
    
    status rat_agenda_status DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. RAT Votes Table
CREATE TABLE IF NOT EXISTS rat_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rat_agenda_id UUID NOT NULL REFERENCES rat_agendas(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES member(id),
    
    vote_option TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(rat_agenda_id, member_id)
);

-- 6. RLS Policies
ALTER TABLE rat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rat_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE rat_agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE rat_votes ENABLE ROW LEVEL SECURITY;

-- RAT Sessions Policies
CREATE POLICY "Admins can manage rat_sessions" ON rat_sessions
    FOR ALL TO authenticated
    USING (
        koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid() AND role IN ('admin', 'pengurus', 'ketua'))
    );

CREATE POLICY "Members can view active rat_sessions" ON rat_sessions
    FOR SELECT TO authenticated
    USING (
        status IN ('scheduled', 'ongoing', 'completed') AND
        koperasi_id IN (SELECT koperasi_id FROM member WHERE user_id = auth.uid())
    );

-- RAT Attendance Policies
CREATE POLICY "Admins can manage attendance" ON rat_attendance
    FOR ALL TO authenticated
    USING (
        rat_session_id IN (SELECT id FROM rat_sessions WHERE koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid() AND role IN ('admin', 'pengurus')))
    );

CREATE POLICY "Members can view own attendance" ON rat_attendance
    FOR SELECT TO authenticated
    USING (member_id IN (SELECT id FROM member WHERE user_id = auth.uid()));

CREATE POLICY "Members can check-in (update own attendance)" ON rat_attendance
    FOR UPDATE TO authenticated
    USING (member_id IN (SELECT id FROM member WHERE user_id = auth.uid()));
    
-- RAT Agendas Policies
CREATE POLICY "Admins can manage agendas" ON rat_agendas
    FOR ALL TO authenticated
    USING (
        rat_session_id IN (SELECT id FROM rat_sessions WHERE koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid() AND role IN ('admin', 'pengurus')))
    );

CREATE POLICY "Members can view agendas" ON rat_agendas
    FOR SELECT TO authenticated
    USING (
        rat_session_id IN (SELECT id FROM rat_sessions WHERE 
            status IN ('scheduled', 'ongoing', 'completed') AND
            koperasi_id IN (SELECT koperasi_id FROM member WHERE user_id = auth.uid())
        )
    );

-- RAT Votes Policies
CREATE POLICY "Admins can view votes (but not change)" ON rat_votes
    FOR SELECT TO authenticated
    USING (
        rat_agenda_id IN (SELECT id FROM rat_agendas WHERE rat_session_id IN (
            SELECT id FROM rat_sessions WHERE koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid() AND role IN ('admin', 'pengurus'))
        ))
    );

CREATE POLICY "Members can view own votes" ON rat_votes
    FOR SELECT TO authenticated
    USING (member_id IN (SELECT id FROM member WHERE user_id = auth.uid()));

CREATE POLICY "Members can cast vote" ON rat_votes
    FOR INSERT TO authenticated
    WITH CHECK (
        member_id IN (SELECT id FROM member WHERE user_id = auth.uid()) AND
        rat_agenda_id IN (SELECT id FROM rat_agendas WHERE status = 'active')
    );

-- Triggers for updated_at
CREATE TRIGGER handle_rat_sessions_updated_at BEFORE UPDATE ON rat_sessions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_rat_attendance_updated_at BEFORE UPDATE ON rat_attendance FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_rat_agendas_updated_at BEFORE UPDATE ON rat_agendas FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
