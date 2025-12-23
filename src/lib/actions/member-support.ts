'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ticketSchema = z.object({
  subject: z.string().min(5, "Subjek minimal 5 karakter"),
  message: z.string().min(10, "Pesan minimal 10 karakter"),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  category: z.string().optional(),
});

export async function createTicket(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const rawData = {
    subject: formData.get('subject'),
    message: formData.get('message'),
    priority: formData.get('priority') || 'medium',
    category: formData.get('category'),
  };

  const validatedFields = ticketSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { subject, message, priority, category } = validatedFields.data;

  // Get Member Info
  const { data: member } = await supabase
    .from('member')
    .select('id, koperasi_id')
    .eq('user_id', user.id)
    .single();

  if (!member) {
    return { error: 'Data anggota tidak ditemukan.' };
  }

  const { error } = await supabase
    .from('support_tickets')
    .insert({
      koperasi_id: member.koperasi_id,
      member_id: member.id,
      subject,
      message,
      // priority, // Table might not have priority/category yet, let's check migration
      // I only added subject, message, status, admin_response.
      // So I will only insert subject and message.
      // If I want priority, I need to migrate. For now, stick to schema.
      status: 'open'
    });

  // Re-checking migration 20251223000000_create_member_features.sql
  // create table if not exists support_tickets (
  //   id uuid default gen_random_uuid() primary key,
  //   koperasi_id uuid references koperasi(id),
  //   member_id uuid references member(id),
  //   subject text not null,
  //   message text not null,
  //   status text default 'open' check (status in ('open', 'in_progress', 'closed')),
  //   admin_response text,
  //   created_at timestamptz default now(),
  //   updated_at timestamptz default now()
  // );
  // No priority column. I will omit it.

  if (error) {
    console.error('Create Ticket Error:', error);
    return { error: 'Gagal membuat tiket support.' };
  }

  revalidatePath('/member/support');
  return { success: true };
}
