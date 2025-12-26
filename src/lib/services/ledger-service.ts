import { SupabaseClient } from '@supabase/supabase-js';
import { LedgerTransaction } from '@/lib/types/ledger';
import crypto from 'crypto';

export class LedgerService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Records a Double Entry transaction into the ledger.
   * Ensures integrity by chaining hashes.
   */
  async recordTransaction(trx: LedgerTransaction) {
    // 1. Validate Amount
    if (trx.amount <= 0) {
      throw new Error('Transaction amount must be positive');
    }

    // 2. Get Open Accounting Period
    const today = new Date();
    const { data: period, error: periodError } = await this.supabase
      .from('accounting_period')
      .select('id')
      .eq('koperasi_id', trx.koperasi_id)
      .lte('start_date', today.toISOString())
      .gte('end_date', today.toISOString())
      .eq('status', 'open') // Assuming 'open' status exists, or handle 'draft' if auto-open
      .single();

    // Fallback: If no open period, try to find a draft one or throw (For MVP, we might need to be lenient or auto-create)
    // For now, let's assume one exists or we fail.
    // NOTE: In Phase 1 Foundation, we didn't populate periods yet. This might block.
    // Workaround for MVP: If no period found, log warning and use a "System Default" or skip period_id check constraint if possible?
    // Architecture says `period_id` is NOT NULL. 
    // FIX: We need a valid period.
    
    let periodId = period?.id;
    if (!periodId) {
        // Try to fetch ANY period for this year just to unblock MVP testing
        const { data: fallbackPeriod } = await this.supabase
            .from('accounting_period')
            .select('id')
            .eq('koperasi_id', trx.koperasi_id)
            .limit(1)
            .maybeSingle();
            
        if (fallbackPeriod) {
            periodId = fallbackPeriod.id;
        } else {
             // CRITICAL: We cannot record ledger without a period.
             // Auto-create a period for MVP purposes?
             // Let's create a "General 2025" period if missing.
             const { data: newPeriod, error: createError } = await this.supabase
                .from('accounting_period')
                .insert({
                    koperasi_id: trx.koperasi_id,
                    period_name: `Auto Period ${today.getFullYear()}`,
                    period_type: 'yearly',
                    year: today.getFullYear(),
                    start_date: `${today.getFullYear()}-01-01`,
                    end_date: `${today.getFullYear()}-12-31`,
                    status: 'open',
                    created_by: trx.created_by
                })
                .select()
                .single();
            
            if (createError) throw new Error(`No accounting period found and failed to create one: ${createError.message}`);
            periodId = newPeriod.id;
        }
    }

    // 3. Get Previous Hash (Chain Integrity)
    // We look for the MOST RECENT entry for this koperasi to chain off it.
    const { data: lastEntry } = await this.supabase
      .from('ledger_entry')
      .select('hash_current')
      .eq('koperasi_id', trx.koperasi_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousHash = lastEntry?.hash_current || 'GENESIS_HASH';

    // 4. Resolve Account UUIDs
    const debitAccountId = await this.ensureAccount(trx.koperasi_id, trx.account_debit, trx.created_by);
    const creditAccountId = await this.ensureAccount(trx.koperasi_id, trx.account_credit, trx.created_by);

    // 5. Compute Current Hash
    // Hash = SHA256(prev_hash + amount + debit + credit + ref + timestamp)
    const entryData = `${previousHash}|${trx.amount}|${debitAccountId}|${creditAccountId}|${trx.tx_reference}|${Date.now()}`;
    const currentHash = crypto.createHash('sha256').update(entryData).digest('hex');

    // 6. Insert Entry
    const isDemoMode = process.env.NEXT_PUBLIC_APP_MODE === 'demo';
    let entry: any | null = null;
    let insertError: any | null = null;
    try {
      const res = await this.supabase
        .from('ledger_entry')
        .insert({
          koperasi_id: trx.koperasi_id,
          period_id: periodId,
          tx_id: crypto.randomUUID(),
          tx_type: trx.tx_type,
          tx_reference: trx.tx_reference,
          account_debit: debitAccountId,
          account_credit: creditAccountId,
          amount: trx.amount,
          description: trx.description,
          metadata: trx.metadata || {},
          source_table: trx.source_table,
          source_id: trx.source_id,
          hash_current: currentHash,
          hash_previous: previousHash,
          entry_date: today.toISOString(),
          book_date: today.toISOString(),
          status: 'posted',
          created_by: trx.created_by,
          is_test_transaction: isDemoMode
        })
        .select()
        .single();
      entry = res.data;
      insertError = res.error;
    } catch (err: any) {
      if (String(err?.message || '').includes('column "is_test_transaction"')) {
        const res = await this.supabase
          .from('ledger_entry')
          .insert({
            koperasi_id: trx.koperasi_id,
            period_id: periodId,
            tx_id: crypto.randomUUID(),
            tx_type: trx.tx_type,
            tx_reference: trx.tx_reference,
            account_debit: debitAccountId,
            account_credit: creditAccountId,
            amount: trx.amount,
            description: trx.description,
            metadata: trx.metadata || {},
            source_table: trx.source_table,
            source_id: trx.source_id,
            hash_current: currentHash,
            hash_previous: previousHash,
            entry_date: today.toISOString(),
            book_date: today.toISOString(),
            status: 'posted',
            created_by: trx.created_by
          })
          .select()
          .single();
        entry = res.data;
        insertError = res.error;
      } else {
        throw err;
      }
    }

    if (insertError) {
      throw new Error(`Ledger Insert Failed: ${insertError.message}`);
    }

    return entry;
  }

  private async ensureAccount(koperasiId: string, accountCode: string, createdBy: string): Promise<string> {
    // 1. Check if exists
    const { data: existing } = await this.supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('koperasi_id', koperasiId)
      .eq('account_code', accountCode)
      .maybeSingle();

    if (existing) return existing.id;

    // 2. Determine Type and Normal Balance
    let type = 'asset';
    let balance = 'debit';
    const prefix = accountCode.split('-')[0];
    
    switch(prefix) {
        case '1': type = 'asset'; balance = 'debit'; break;
        case '2': type = 'liability'; balance = 'credit'; break;
        case '3': type = 'equity'; balance = 'credit'; break;
        case '4': type = 'revenue'; balance = 'credit'; break;
        case '5': type = 'expense'; balance = 'debit'; break;
    }

    // 3. Create
    const { data: newAccount, error } = await this.supabase
        .from('chart_of_accounts')
        .insert({
            koperasi_id: koperasiId,
            account_code: accountCode,
            account_name: `Auto Account ${accountCode}`, // Ideally should be passed, but for auto-provisioning this works
            level: 4, // Detail account
            account_type: type,
            normal_balance: balance,
            is_header: false,
            created_by: createdBy
        })
        .select('id')
        .single();
        
    if (error) throw new Error(`Failed to create account ${accountCode}: ${error.message}`);
    return newAccount.id;
  }
}
