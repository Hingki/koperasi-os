import { createClient } from '@/lib/supabase/client';
import { Account, JournalEntry, JournalLine, LedgerBalance, TrialBalanceItem } from '@/types/accounting';
import { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

export interface CreateAccountDTO {
  koperasi_id: string;
  code: string;
  name: string;
  type: string;
  normal_balance: 'DEBIT' | 'CREDIT';
  parent_id?: string | null;
  description?: string;
}

export interface JournalLineDTO {
  account_id: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateJournalDTO {
  koperasi_id: string;
  business_unit: string;
  transaction_date: string; // ISO Date string YYYY-MM-DD
  description: string;
  reference_id?: string;
  reference_type?: string;
  lines: JournalLineDTO[];
  created_by?: string; // Optional: for system/service calls
}

export const AccountingService = {
  /**
   * Helper to get Account ID by Code (Server-Side safe)
   */
  async getAccountIdByCode(koperasiId: string, code: string, client?: SupabaseClient): Promise<string | null> {
    const supabase = client || createClient();
    const { data, error } = await supabase
      .from('accounts')
      .select('id')
      .eq('koperasi_id', koperasiId)
      .eq('code', code)
      .single();

    if (error) {
      console.warn(`Account not found for code ${code} in koperasi ${koperasiId}: ${error.message}`);
    }

    if (error || !data) return null;
    return data.id;
  },

  /**
   * Create a new Chart of Account (COA)
   */
  async createAccount(data: CreateAccountDTO) {
    const supabase = createClient();
    const { data: user } = await supabase.auth.getUser();

    if (!user.user) throw new Error('Unauthorized');

    const { data: account, error } = await supabase
      .from('accounts')
      .insert({
        ...data,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;
    return account as Account;
  },

  /**
   * Get all accounts for a specific Koperasi
   */
  async getAccounts(koperasiId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .order('code', { ascending: true });

    if (error) throw error;
    return data as Account[];
  },

  /**
   * Post a Journal Entry (Change status from Draft to Posted)
   * Requires Authorization: BENDAHARA only
   */
  async approveJournal(journalId: string, userId: string) {
    const supabase = createClient();

    // 1. Verify Role
    const { data: role } = await supabase
      .from('user_role')
      .select('role, koperasi_id')
      .eq('user_id', userId)
      .single();

    if (!role || role.role !== 'bendahara') {
      throw new Error('Unauthorized: Only BENDAHARA can post journals.');
    }

    // 2. Update Status
    const { error } = await supabase
      .from('ledger_entry')
      .update({
        status: 'posted',
        posted_by: userId,
        posted_at: new Date().toISOString()
      })
      .eq('id', journalId)
      .eq('status', 'draft'); // Can only post draft

    if (error) throw error;
    return { success: true };
  },

  /**
   * Void a Journal Entry
   * Requires Authorization: BENDAHARA or KETUA
   */
  async markJournalAsVoid(journalId: string, userId: string, reason: string) {
    const supabase = createClient();
    if (!reason) throw new Error('Void reason is required');

    // 1. Verify Role
    const { data: role } = await supabase
      .from('user_role')
      .select('role, koperasi_id')
      .eq('user_id', userId)
      .single();

    if (!role || !['bendahara', 'ketua'].includes(role.role)) {
      throw new Error('Unauthorized: Only BENDAHARA or KETUA can void journals.');
    }

    // 2. Update Status
    const { error } = await supabase
      .from('ledger_entry')
      .update({
        status: 'void',
        voided_by: userId,
        voided_at: new Date().toISOString(),
        void_reason: reason
      })
      .eq('id', journalId);

    if (error) throw error;
    return { success: true };
  },

  /**
   * Get Journals with Pagination & Filtering
   */
  async getJournals(
    koperasiId: string,
    params: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      businessUnit?: string;
    },
    client?: SupabaseClient
  ) {
    const supabase = client || createClient();
    const page = params.page || 1;
    const limit = params.limit || 20;
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabase
      .from('journals')
      .select(`
        *,
        journal_lines (
          *,
          accounts (
            code,
            name
          )
        )
      `, { count: 'exact' })
      .eq('koperasi_id', koperasiId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(start, end);

    if (params.startDate) {
      query = query.gte('transaction_date', params.startDate);
    }
    if (params.endDate) {
      query = query.lte('transaction_date', params.endDate);
    }
    if (params.businessUnit) {
      query = query.eq('business_unit', params.businessUnit);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      data: data as (JournalEntry & { journal_lines: (JournalLine & { accounts: { code: string; name: string } | null })[] })[],
      count: count || 0,
      totalPages: Math.ceil((count || 0) / limit)
    };
  },

  /**
   * Void a Journal Entry by Posting a Reversal
   * Creates a compensating journal with swapped debit/credit for all lines.
   * Preserves immutability and audit trail.
   */
  async voidJournal(
    originalJournalId: string,
    reason: string,
    client?: SupabaseClient
  ) {
    const supabase = client || createClient();

    // Fetch original journal
    const { data: journal, error: jErr } = await supabase
      .from('journals')
      .select('*')
      .eq('id', originalJournalId)
      .single();

    if (jErr || !journal) throw new Error(jErr?.message || 'Original journal not found');

    // Fetch lines
    const { data: lines, error: lErr } = await supabase
      .from('journal_lines')
      .select('account_id, debit, credit, description')
      .eq('journal_id', originalJournalId);

    if (lErr) throw new Error(lErr.message);

    const reversalLines = (lines || []).map((l: any) => ({
      account_id: l.account_id,
      debit: Number(l.credit) || 0,
      credit: Number(l.debit) || 0,
      description: `VOID REVERSAL: ${l.description || journal.description}`
    }));

    const dto: CreateJournalDTO = {
      koperasi_id: journal.koperasi_id,
      business_unit: journal.business_unit,
      transaction_date: journal.transaction_date,
      description: `VOID of ${journal.description} (${originalJournalId}) - ${reason}`,
      reference_id: originalJournalId,
      reference_type: 'JOURNAL_VOID',
      lines: reversalLines,
      created_by: journal.created_by || undefined
    };

    await this.postJournal(dto, supabase);
  },

  /**
   * Post a Journal Entry via RPC
   * Enforces:
   * 1. Period Lock Awareness
   * 2. Double-Entry Validation (Debit = Credit)
   * 3. Atomicity (All or Nothing)
   */
  async postJournal(entry: CreateJournalDTO, client?: SupabaseClient) {
    const supabase = client || createClient();

    let userId = entry.created_by;
    if (!userId) {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Unauthorized: No user session and no created_by provided');
      userId = user.user.id;
    }

    const { data: journalId, error } = await supabase.rpc('post_journal_entry', {
      p_koperasi_id: entry.koperasi_id,
      p_business_unit: entry.business_unit,
      p_transaction_date: entry.transaction_date,
      p_description: entry.description,
      p_reference_id: entry.reference_id || null,
      p_reference_type: entry.reference_type || null,
      p_lines: entry.lines,
      p_created_by: userId
    });

    if (error) {
      console.error('Post Journal Error:', JSON.stringify(error, null, 2));
      console.error('Post Journal Params:', JSON.stringify({
        p_koperasi_id: entry.koperasi_id,
        p_business_unit: entry.business_unit,
        p_transaction_date: entry.transaction_date,
        p_reference_id: entry.reference_id,
        p_reference_type: entry.reference_type,
        p_lines_count: entry.lines.length,
        p_created_by: userId
      }, null, 2));
      throw new Error(error.message || 'Failed to post journal entry');
    }

    return journalId;
  },

  /**
   * Get Trial Balance (Neraca Saldo)
   * Aggregates all journal lines up to the end date
   */
  async getTrialBalance(koperasiId: string, endDate: string): Promise<TrialBalanceItem[]> {
    const supabase = createClient();

    // Using a raw query approach for aggregation since we don't have a specific view yet
    // In a real production scenario, this might be a materialized view or RPC
    const { data, error } = await supabase
      .from('journal_lines')
      .select(`
        debit,
        credit,
        account:accounts!inner (
          code,
          name,
          normal_balance
        ),
        journal:journals!inner (
          transaction_date,
          koperasi_id
        )
      `)
      .eq('journal.koperasi_id', koperasiId)
      .lte('journal.transaction_date', endDate);

    if (error) throw error;

    // Aggregation in JS (for now, for simplicity. Large datasets should move to SQL/RPC)
    const balanceMap = new Map<string, TrialBalanceItem>();

    data.forEach((line: any) => {
      const code = line.account.code;
      const current = balanceMap.get(code) || {
        account_code: code,
        account_name: line.account.name,
        debit: 0,
        credit: 0
      };

      current.debit += Number(line.debit);
      current.credit += Number(line.credit);
      balanceMap.set(code, current);
    });

    // Sort by account code
    return Array.from(balanceMap.values()).sort((a, b) => a.account_code.localeCompare(b.account_code));
  }
};
