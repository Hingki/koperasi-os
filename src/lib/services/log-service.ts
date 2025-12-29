import { SupabaseClient } from '@supabase/supabase-js';

export type LogActionType = 'SIMPANAN' | 'POS' | 'PINJAMAN' | 'TUTUP_BUKU' | 'SYSTEM';
export type LogStatus = 'SUCCESS' | 'FAILURE' | 'WARNING';

export interface LogEntry {
  action_type: LogActionType;
  action_detail: string;
  entity_id?: string;
  user_id?: string;
  user_role?: string;
  status: LogStatus;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

export class LogService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Writes a log entry to the system_logs table.
   * This method is designed to never throw an error to the caller.
   */
  async log(entry: LogEntry): Promise<void> {
    try {
      let userId = entry.user_id;
      let userRole = entry.user_role;

      // specific logic to resolve user details if missing
      if (!userId) {
        const { data: { user } } = await this.supabase.auth.getUser();
        userId = user?.id;
      }

      // If userRole is still missing and we have a userId, we might want to fetch it
      // But to keep it non-intrusive and fast, we'll accept it might be null
      // or the caller should provide it.
      
      const { error } = await this.supabase.from('system_logs').insert({
        action_type: entry.action_type,
        action_detail: entry.action_detail,
        entity_id: entry.entity_id,
        user_id: userId,
        user_role: userRole,
        status: entry.status,
        metadata: entry.metadata || {},
        ip_address: entry.ip_address,
        user_agent: entry.user_agent
      });

      if (error) {
        console.error('SystemLog Insert Error:', error);
      }
    } catch (err) {
      // Catch-all to ensure we never throw
      console.error('SystemLog Exception:', err);
    }
  }
}
