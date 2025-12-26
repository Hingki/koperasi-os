import { SupabaseClient } from '@supabase/supabase-js';

export type RatStatus = 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type RatAgendaStatus = 'pending' | 'active' | 'completed';
export type RatAttendanceStatus = 'registered' | 'present' | 'absent' | 'excused';

export interface RatSessionData {
  koperasi_id: string;
  title: string;
  description?: string;
  fiscal_year: number;
  start_time: Date;
  end_time?: Date;
  location?: string;
  meeting_link?: string;
  documents?: any[];
  quorum_min_percent?: number;
}

export interface RatAgendaData {
  rat_session_id: string;
  title: string;
  description?: string;
  order_index?: number;
  is_voting_required?: boolean;
  voting_options?: string[];
}

export class RatService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new RAT Session
   */
  async createSession(data: RatSessionData) {
    const { data: session, error } = await this.supabase
      .from('rat_sessions')
      .insert({
        ...data,
        status: 'draft',
        documents: data.documents || []
      })
      .select()
      .single();

    if (error) throw error;
    return session;
  }

  /**
   * Update RAT Session details
   */
  async updateSession(id: string, data: Partial<RatSessionData> & { status?: RatStatus }) {
    const { data: session, error } = await this.supabase
      .from('rat_sessions')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return session;
  }

  /**
   * Get a single RAT session by ID
   */
  async getSession(id: string) {
    const { data: session, error } = await this.supabase
      .from('rat_sessions')
      .select(`
        *,
        rat_agendas (*),
        rat_attendance (count)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return session;
  }

  /**
   * Get Active or Scheduled sessions for a Koperasi
   */
  async getActiveSessions(koperasiId: string) {
    const { data, error } = await this.supabase
      .from('rat_sessions')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .in('status', ['scheduled', 'ongoing'])
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Add an agenda item to a session
   */
  async addAgenda(data: RatAgendaData) {
    const { data: agenda, error } = await this.supabase
      .from('rat_agendas')
      .insert({
        ...data,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return agenda;
  }

  /**
   * Update agenda status (e.g. open voting)
   */
  async updateAgendaStatus(id: string, status: RatAgendaStatus) {
    const { data: agenda, error } = await this.supabase
      .from('rat_agendas')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return agenda;
  }

  /**
   * Register member attendance (Check-in)
   */
  async registerAttendance(sessionId: string, memberId: string, ipAddress?: string, deviceInfo?: string) {
    // Upsert to handle re-check-ins or status updates
    const { data, error } = await this.supabase
      .from('rat_attendance')
      .upsert({
        rat_session_id: sessionId,
        member_id: memberId,
        status: 'present',
        check_in_time: new Date(),
        ip_address: ipAddress,
        device_info: deviceInfo
      }, { onConflict: 'rat_session_id, member_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Submit a vote for an agenda
   */
  async submitVote(agendaId: string, memberId: string, voteOption: string) {
    // Check if agenda is active
    const { data: agenda } = await this.supabase
      .from('rat_agendas')
      .select('status, is_voting_required, voting_options')
      .eq('id', agendaId)
      .single();

    if (!agenda || agenda.status !== 'active') {
      throw new Error('Voting is not active for this agenda');
    }

    if (!agenda.is_voting_required) {
      throw new Error('This agenda does not require voting');
    }

    // Check valid option
    const options = agenda.voting_options as string[];
    if (!options.includes(voteOption)) {
      throw new Error('Invalid vote option');
    }

    const { data, error } = await this.supabase
      .from('rat_votes')
      .insert({
        rat_agenda_id: agendaId,
        member_id: memberId,
        vote_option: voteOption
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new Error('You have already voted on this agenda');
      }
      throw error;
    }
    return data;
  }

  /**
   * Get vote results for an agenda
   */
  async getVoteResults(agendaId: string) {
    const { data, error } = await this.supabase
      .from('rat_votes')
      .select('vote_option');

    if (error) throw error;

    // Aggregate results
    const results: Record<string, number> = {};
    data.forEach(vote => {
      results[vote.vote_option] = (results[vote.vote_option] || 0) + 1;
    });

    return results;
  }

  /**
   * Get member attendance status
   */
  async getMemberAttendance(sessionId: string, memberId: string) {
    const { data, error } = await this.supabase
      .from('rat_attendance')
      .select('*')
      .eq('rat_session_id', sessionId)
      .eq('member_id', memberId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'Row not found'
    return data;
  }
}
