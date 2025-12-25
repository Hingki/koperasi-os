
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const replySchema = z.object({
  ticketId: z.string().uuid(),
  reply: z.string().min(1, "Balasan tidak boleh kosong"),
  status: z.enum(['open', 'in_progress', 'closed']),
});

export async function replyTicket(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // Check if admin (optional, depending on RLS but good for UX)
  // We rely on RLS mostly.

  const rawData = {
    ticketId: formData.get('ticketId'),
    reply: formData.get('reply'),
    status: formData.get('status'),
  };

  const validatedFields = replySchema.safeParse(rawData);

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  const { ticketId, reply, status } = validatedFields.data;

  const { error } = await supabase
    .from('support_tickets')
    .update({
      admin_response: reply,
      status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', ticketId);

  if (error) {
    console.error('Reply Ticket Error:', error);
    return { error: 'Gagal mengirim balasan.' };
  }

  revalidatePath(`/dashboard/support`);
  revalidatePath(`/dashboard/support/${ticketId}`);
  revalidatePath(`/member/support`); // Also revalidate member side
  return { success: true };
}
