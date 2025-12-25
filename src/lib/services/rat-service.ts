import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Service for Electronic Annual Member Meeting (E-RAT)
 * 
 * Assumed Schema:
 * - rat_sessions (id, koperasi_id, title, scheduled_at, status, agenda, documents)
 * - rat_attendance (id, session_id, member_id, check_in_time, method)
 * - rat_votings (id, session_id, title, description, options, status, created_at)
 * - rat_votes (id, voting_id, member_id, choice_index, created_at)
 */

export interface RatSession {
  id: string;
  koperasi_id: string;
  title: string;
  scheduled_at: string;
  status: 'scheduled' | 'live' | 'completed';
  agenda: string;
  documents?: { name: string; url: string }[];
  quorum_reached?: boolean;
}

export interface RatVoting {
  id: string;
  session_id: string;
  title: string;
  description?: string;
  options: string[]; // ["Setuju", "Tidak Setuju", "Abstain"]
  status: 'pending' | 'open' | 'closed';
  results?: Record<string, number>;
}

export class RatService {
  constructor(private supabase: SupabaseClient) {}

  // --- Session Management ---

  async createSession(koperasiId: string, payload: Partial<RatSession>, userId: string) {
    const { data, error } = await this.supabase
      .from('rat_sessions')
      .insert({
        koperasi_id: koperasiId,
        title: payload.title,
        scheduled_at: payload.scheduled_at,
        agenda: payload.agenda,
        documents: payload.documents || [],
        status: 'scheduled',
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSession(sessionId: string) {
    const { data, error } = await this.supabase
      .from('rat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return data;
  }

  async updateSessionStatus(sessionId: string, status: 'live' | 'completed') {
    const { error } = await this.supabase
      .from('rat_sessions')
      .update({ status })
      .eq('id', sessionId);
    
    if (error) throw error;
  }

  // --- Attendance ---

  async checkInMember(sessionId: string, memberId: string, method: 'online' | 'onsite' = 'online') {
    // Check if already checked in
    const { data: existing } = await this.supabase
      .from('rat_attendance')
      .select('id')
      .eq('session_id', sessionId)
      .eq('member_id', memberId)
      .single();

    if (existing) return existing;

    const { data, error } = await this.supabase
      .from('rat_attendance')
      .insert({
        session_id: sessionId,
        member_id: memberId,
        method: method,
        check_in_time: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getAttendanceStats(sessionId: string) {
    const { count, error } = await this.supabase
      .from('rat_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (error) throw error;
    return count || 0;
  }

  // --- Voting ---

  async createVoting(sessionId: string, title: string, options: string[], userId: string) {
    const { data, error } = await this.supabase
      .from('rat_votings')
      .insert({
        session_id: sessionId,
        title: title,
        options: options,
        status: 'pending',
        created_by: userId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async openVoting(votingId: string) {
    const { error } = await this.supabase
      .from('rat_votings')
      .update({ status: 'open' })
      .eq('id', votingId);
    if (error) throw error;
  }

  async closeVoting(votingId: string) {
    const { error } = await this.supabase
      .from('rat_votings')
      .update({ status: 'closed' })
      .eq('id', votingId);
    if (error) throw error;
  }

  async submitVote(votingId: string, memberId: string, choiceIndex: number) {
    // 1. Verify Voting is Open
    const { data: voting } = await this.supabase
      .from('rat_votings')
      .select('status, options')
      .eq('id', votingId)
      .single();

    if (!voting || voting.status !== 'open') throw new Error('Voting is not open');
    if (choiceIndex < 0 || choiceIndex >= voting.options.length) throw new Error('Invalid choice');

    // 2. Check if already voted
    const { data: existing } = await this.supabase
      .from('rat_votes')
      .select('id')
      .eq('voting_id', votingId)
      .eq('member_id', memberId)
      .maybeSingle();

    if (existing) throw new Error('You have already voted');

    // 3. Cast Vote
    const { error } = await this.supabase
      .from('rat_votes')
      .insert({
        voting_id: votingId,
        member_id: memberId,
        choice_index: choiceIndex
      });

    if (error) throw error;
    return true;
  }

  async getVotingResults(votingId: string) {
    // Get all votes
    const { data: votes, error } = await this.supabase
      .from('rat_votes')
      .select('choice_index')
      .eq('voting_id', votingId);

    if (error) throw error;

    // Aggregate
    const results: Record<number, number> = {};
    votes?.forEach(v => {
      results[v.choice_index] = (results[v.choice_index] || 0) + 1;
    });

    return results;
  }
}
