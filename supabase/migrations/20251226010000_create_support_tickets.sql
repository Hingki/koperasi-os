-- Migration: Create Support Tickets Tables
-- Description: Creates tables for support tickets and messages (ticket system)
-- Date: 2025-12-26

-- Enum for Ticket Status and Category
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_category AS ENUM ('question', 'suggestion', 'criticism', 'other');

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    koperasi_id UUID NOT NULL REFERENCES koperasi(id),
    member_id UUID NOT NULL REFERENCES member(id),
    
    subject TEXT NOT NULL,
    category ticket_category NOT NULL DEFAULT 'question',
    status ticket_status NOT NULL DEFAULT 'open',
    priority TEXT DEFAULT 'medium', -- low, medium, high
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS handle_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER handle_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Support Ticket Messages Table
CREATE TABLE IF NOT EXISTS support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    
    sender_id UUID NOT NULL REFERENCES auth.users(id), -- The user who sent the message
    sender_type TEXT NOT NULL, -- 'member' or 'admin'
    
    message TEXT NOT NULL,
    attachments TEXT[], -- Array of URLs
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for support_tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Members can view their own tickets
DROP POLICY IF EXISTS "Members can view own tickets" ON support_tickets;
CREATE POLICY "Members can view own tickets" 
    ON support_tickets FOR SELECT 
    TO authenticated 
    USING (
        member_id IN (SELECT id FROM member WHERE user_id = auth.uid())
    );

-- Members can create tickets
DROP POLICY IF EXISTS "Members can create tickets" ON support_tickets;
CREATE POLICY "Members can create tickets" 
    ON support_tickets FOR INSERT 
    TO authenticated 
    WITH CHECK (
        member_id IN (SELECT id FROM member WHERE user_id = auth.uid())
    );

-- Admins can view all tickets in their koperasi
DROP POLICY IF EXISTS "Admins can view all tickets" ON support_tickets;
CREATE POLICY "Admins can view all tickets" 
    ON support_tickets FOR SELECT 
    TO authenticated 
    USING (
        koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid())
    );

-- Admins can update tickets (status, etc)
DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;
CREATE POLICY "Admins can update tickets" 
    ON support_tickets FOR UPDATE 
    TO authenticated 
    USING (
        koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid())
    );

-- RLS for support_ticket_messages
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Participants (Member or Admin) can view messages for tickets they have access to
DROP POLICY IF EXISTS "View messages for accessible tickets" ON support_ticket_messages;
CREATE POLICY "View messages for accessible tickets" 
    ON support_ticket_messages FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets st
            WHERE st.id = support_ticket_messages.ticket_id
            AND (
                -- Member owns the ticket
                st.member_id IN (SELECT id FROM member WHERE user_id = auth.uid())
                OR
                -- User is admin of the koperasi
                st.koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid())
            )
        )
    );

-- Participants can insert messages
DROP POLICY IF EXISTS "Insert messages for accessible tickets" ON support_ticket_messages;
CREATE POLICY "Insert messages for accessible tickets" 
    ON support_ticket_messages FOR INSERT 
    TO authenticated 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets st
            WHERE st.id = support_ticket_messages.ticket_id
            AND (
                st.member_id IN (SELECT id FROM member WHERE user_id = auth.uid())
                OR
                st.koperasi_id IN (SELECT koperasi_id FROM user_role WHERE user_id = auth.uid())
            )
        )
    );
