import { SupabaseClient } from '@supabase/supabase-js';

export class NotificationService {
  constructor(private supabase: SupabaseClient) {}

  async createNotification(memberId: string, title: string, message: string) {
    const { data: member, error: memberError } = await this.supabase
      .from('member')
      .select('id, koperasi_id, user_id')
      .eq('id', memberId)
      .single();

    if (memberError || !member) throw new Error('Member not found');

    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        member_id: memberId,
        koperasi_id: member.koperasi_id,
        user_id: member.user_id,
        title,
        message,
        is_read: false
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }
}
