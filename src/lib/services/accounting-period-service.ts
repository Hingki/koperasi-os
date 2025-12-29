import { SupabaseClient } from '@supabase/supabase-js';
import { calculateAccountBalances } from '@/lib/utils/accounting';

export class AccountingPeriodService {
  constructor(private supabase: SupabaseClient) { }

  async closePeriod(koperasiId: string, periodId: string, userId: string, reason: string) {
    if (!reason) throw new Error('Close reason is required');

    // Verify Role (BENDAHARA)
    const { data: role } = await this.supabase
      .from('user_role')
      .select('role')
      .eq('user_id', userId)
      .eq('koperasi_id', koperasiId)
      .single();

    if (!role || role.role !== 'bendahara') {
      throw new Error('Unauthorized: Only BENDAHARA can close periods');
    }

    // 1. Get Period Details
    const { data: period, error: periodError } = await this.supabase
      .from('accounting_period')
      .select('*')
      .eq('id', periodId)
      .eq('koperasi_id', koperasiId)
      .single();

    if (periodError || !period) throw new Error('Period not found');
    if (period.status !== 'open') throw new Error('Only OPEN periods can be closed');

    // 2. Check for Draft Entries
    const { count: draftCount, error: draftError } = await this.supabase
      .from('ledger_entry')
      .select('*', { count: 'exact', head: true })
      .eq('period_id', periodId)
      .eq('status', 'draft');

    if (draftError) throw draftError;
    if (draftCount && draftCount > 0) {
      throw new Error(`Cannot close period. Found ${draftCount} draft entries.`);
    }

    // 3. Find Next Period (to store opening balances)
    const { data: nextPeriod, error: nextPeriodError } = await this.supabase
      .from('accounting_period')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .gt('start_date', period.end_date)
      .order('start_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!nextPeriod) {
      throw new Error('Next accounting period not found. Please create the next period before closing the current one.');
    }

    // 4. Calculate Ending Balances (which become Opening Balances)
    // We need ALL history up to the end of this period to get accurate balances.
    // Or, if we have a previous snapshot, we can use that + entries in this period.
    // For safety/simplicity in this MVP, we calculate from scratch or use ReportService logic.
    // Let's use a specialized query or reuse ReportService logic if possible.
    // But ReportService is in another file. I'll replicate the fetching logic here for independence or instantiate ReportService.
    // Instantiating ReportService is better to DRY.

    // We need to fetch ALL accounts and ALL entries up to period.end_date
    // Optimization: If we have a previous snapshot for THIS period, we could start there.
    // But let's assume we want to be 100% sure and calculate from ledger (or previous snapshots if implemented in ReportService).

    // Let's fetch everything up to end_date.
    const { data: accounts } = await this.supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('koperasi_id', koperasiId);

    // Fetch entries up to end date (posted only)
    // Note: This might be heavy. In production, we should use previous snapshots.
    // For now, consistent with "Ledger-First", we sum up.
    // Optimization: We can check if there's a snapshot for the CURRENT period (start of it).
    // If so, use it + entries in current period.

    const { data: currentSnapshot } = await this.supabase
      .from('opening_balance_snapshot')
      .select('*')
      .eq('period_id', periodId);

    let balances: Record<string, number> = {};

    if (currentSnapshot && currentSnapshot.length > 0) {
      // Use Snapshot + Current Period Entries
      currentSnapshot.forEach(s => {
        balances[s.account_id] = Number(s.balance);
      });

      const { data: periodEntries } = await this.supabase
        .from('ledger_entry')
        .select('account_debit, account_credit, amount')
        .eq('koperasi_id', koperasiId)
        .eq('status', 'posted')
        .gte('book_date', period.start_date)
        .lte('book_date', period.end_date);

      if (periodEntries) {
        periodEntries.forEach(entry => {
          balances[entry.account_debit] = (balances[entry.account_debit] || 0) + Number(entry.amount); // Debit increases asset (normal debit)
          balances[entry.account_credit] = (balances[entry.account_credit] || 0) - Number(entry.amount); // Credit decreases asset
          // Wait, the `calculateAccountBalances` utility handles normal balance logic (debit vs credit).
          // But here I'm doing raw math.
          // To reuse `calculateAccountBalances`, I need to pass the snapshot as "initial values"?
          // `calculateAccountBalances` takes `Account[]` and `LedgerEntry[]`. It doesn't take initial balances.
          // I should probably improve `calculateAccountBalances` or do it manually here properly.

          // Let's stick to "Fetch All" for now to ensure correctness (Task 1: Financial Report Consistency).
          // "ReportService: Jika periode CLOSED → gunakan snapshot + ledger berjalan; Jika OPEN → hitung full dari ledger"
          // This implies we SHOULD use snapshot if available.
          // Since we are closing, we are creating the snapshot for the NEXT period.
          // To do that, we need the ending balance of THIS period.
        });

        // Actually, `calculateAccountBalances` calculates based on normal_balance.
        // Let's fetch ALL entries for now to be safe and avoid logic mismatch.
        // Performance impact is acceptable for MVP.
      }
    }

    // Fallback: Calculate from scratch (or if no snapshot exists yet)
    // This ensures we don't propagate errors.
    const { data: allEntries } = await this.supabase
      .from('ledger_entry')
      .select('account_debit, account_credit, amount')
      .eq('koperasi_id', koperasiId)
      .eq('status', 'posted')
      .lte('book_date', period.end_date); // Up to end of this period

    if (!allEntries || !accounts) throw new Error('Failed to fetch data for closing');

    const calculatedBalances = calculateAccountBalances(accounts, allEntries);

    // 5. Insert Snapshots
    const snapshots = accounts.map(acc => ({
      koperasi_id: koperasiId,
      period_id: nextPeriod.id,
      account_id: acc.id,
      balance: calculatedBalances[acc.id] || 0,
      created_by: userId
    }));

    if (snapshots.length > 0) {
      const { error: insertError } = await this.supabase
        .from('opening_balance_snapshot')
        .insert(snapshots);

      if (insertError) throw insertError;
    }

    // 6. Update Period Status
    const { error: updateError } = await this.supabase
      .from('accounting_period')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: userId,
        close_reason: reason
      })
      .eq('id', periodId);

    if (updateError) throw updateError;

    return { success: true, nextPeriodId: nextPeriod.id };
  }

  async reopenPeriod(koperasiId: string, periodId: string, userId: string, reason: string) {
    if (!reason) throw new Error('Reopen reason is required');

    // Verify Role (KETUA)
    const { data: role } = await this.supabase
      .from('user_role')
      .select('role')
      .eq('user_id', userId)
      .eq('koperasi_id', koperasiId)
      .single();

    if (!role || role.role !== 'ketua') {
      throw new Error('Unauthorized: Only KETUA can reopen periods');
    }

    // 1. Get Period
    const { data: period } = await this.supabase
      .from('accounting_period')
      .select('*')
      .eq('id', periodId)
      .single();

    if (!period || period.status !== 'closed') {
      throw new Error('Period is not closed or not found');
    }

    // 2. Check if NEXT period is already closed (Chain Integrity)
    // If next period is closed, we cannot reopen this one easily because balances propagated.
    // For MVP, we can block it.
    const { data: nextPeriod } = await this.supabase
      .from('accounting_period')
      .select('*')
      .eq('koperasi_id', koperasiId)
      .gt('start_date', period.end_date)
      .order('start_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextPeriod && nextPeriod.status === 'closed') {
      throw new Error('Cannot reopen this period because the subsequent period is already closed. Reopen the latest period first.');
    }

    // 3. Delete Snapshots for Next Period (Since we are reopening this one, the ending balance -> next opening balance becomes invalid/dirty)
    if (nextPeriod) {
      await this.supabase
        .from('opening_balance_snapshot')
        .delete()
        .eq('period_id', nextPeriod.id);
    }

    // 4. Update Status
    const { error } = await this.supabase
      .from('accounting_period')
      .update({
        status: 'open',
        reopened_by: userId,
        reopened_at: new Date().toISOString(),
        reopen_reason: reason
      })
      .eq('id', periodId);

    if (error) throw error;

    return { success: true };
  }
}
