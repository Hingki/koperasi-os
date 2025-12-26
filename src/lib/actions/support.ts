'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const createTicketSchema = z.object({
    subject: z.string().min(5, "Subjek minimal 5 karakter"),
    category: z.enum(['ui_ux', 'bug', 'feature_request', 'question', 'suggestion', 'criticism', 'other']),
    message: z.string().optional(),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    screenshot_url: z.string().optional(),
});

const replySchema = z.object({
    message: z.string().min(1, "Pesan tidak boleh kosong"),
});

// --- Member Actions ---

export async function createTicketAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Get Member ID
    const { data: member } = await supabase.from('member').select('id, koperasi_id').eq('user_id', user.id).single();
    if (!member) throw new Error("Member profile not found");

    const rawData = {
        subject: formData.get('subject'),
        category: formData.get('category'),
        message: formData.get('message'),
        priority: formData.get('priority') || 'medium',
        screenshot_url: formData.get('screenshot_url'),
    };

    const validatedData = createTicketSchema.parse(rawData);

    // 1. Create Ticket
    const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
            koperasi_id: member.koperasi_id,
            member_id: member.id,
            subject: validatedData.subject,
            category: validatedData.category,
            priority: validatedData.priority,
            status: 'open',
            screenshot_url: validatedData.screenshot_url
        })
        .select()
        .single();

    if (ticketError) throw new Error(ticketError.message);

    // 2. Create Initial Message (only if message provided)
    if (validatedData.message) {
        const { error: msgError } = await supabase
            .from('support_ticket_messages')
            .insert({
                ticket_id: ticket.id,
                sender_id: user.id,
                sender_type: 'member',
                message: validatedData.message
            });

        if (msgError) throw new Error(msgError.message);
    }

    revalidatePath('/member/support');
    redirect('/member/support');
}

export async function getMemberTicketsAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: member } = await supabase.from('member').select('id').eq('user_id', user.id).single();
    if (!member) return { success: false, error: 'Member not found' };

    try {
        const { data, error } = await supabase
            .from('support_tickets')
            .select('*')
            .eq('member_id', member.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- Shared / Common Actions ---

export async function getTicketDetailsAction(ticketId: string) {
    const supabase = await createClient();
    
    try {
        // Fetch Ticket
        const { data: ticket, error: ticketError } = await supabase
            .from('support_tickets')
            .select(`
                *,
                member:member(nama_lengkap, no_anggota)
            `)
            .eq('id', ticketId)
            .single();

        if (ticketError) throw ticketError;

        // Fetch Messages
        const { data: messages, error: msgError } = await supabase
            .from('support_ticket_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        return { success: true, ticket, messages };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function replyTicketAction(ticketId: string, message: string, senderType: 'member' | 'admin') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validated = replySchema.safeParse({ message });
    if (!validated.success) return { success: false, error: validated.error.errors[0].message };

    try {
        const { error } = await supabase
            .from('support_ticket_messages')
            .insert({
                ticket_id: ticketId,
                sender_id: user.id,
                sender_type: senderType,
                message: validated.data.message
            });

        if (error) throw error;

        // Update ticket updated_at
        await supabase
            .from('support_tickets')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', ticketId);
        
        revalidatePath(`/member/support/${ticketId}`);
        revalidatePath(`/dashboard/support/${ticketId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- Admin Actions ---

export async function getAdminTicketsAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: userRole } = await supabase.from('user_role').select('koperasi_id').eq('user_id', user.id).single();
    if (!userRole?.koperasi_id) return { success: false, error: 'Koperasi context not found' };

    try {
        const { data, error } = await supabase
            .from('support_tickets')
            .select(`
                *,
                member:member(nama_lengkap)
            `)
            .eq('koperasi_id', userRole.koperasi_id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateTicketStatusAction(ticketId: string, status: string) {
    const supabase = await createClient();
    
    try {
        const { error } = await supabase
            .from('support_tickets')
            .update({ status })
            .eq('id', ticketId);

        if (error) throw error;

        revalidatePath(`/dashboard/support/${ticketId}`);
        revalidatePath(`/dashboard/support`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
