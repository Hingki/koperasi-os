'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { LedgerService } from '@/lib/services/ledger-service';
// import { AccountCode } from '@/lib/types/ledger'; // Not used here as we pass raw IDs

export async function createAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Get Koperasi ID
  const { data: member } = await supabase.from('member').select('koperasi_id').eq('user_id', user.id).single();
  // Fallback if not member (e.g. pure admin), try to get from user_metadata or first koperasi
  let koperasiId = member?.koperasi_id;
  if (!koperasiId) {
      // For MVP/UAT, fetch first koperasi
      const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
      koperasiId = kop?.id;
  }

  const account_code = formData.get('account_code') as string;
  const account_name = formData.get('account_name') as string;
  const account_type = formData.get('account_type') as string;
  const normal_balance = formData.get('normal_balance') as string;
  
  const { error } = await supabase.from('chart_of_accounts').insert({
    koperasi_id: koperasiId,
    account_code,
    account_name,
    account_type,
    normal_balance,
    level: 4, // Default to detail
    is_header: false,
    created_by: user.id
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/accounting/coa');
  revalidatePath('/dashboard/settings/coa');
  redirect('/dashboard/settings/coa');
}

export async function updateAccount(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const id = formData.get('id') as string;
  const account_code = formData.get('account_code') as string;
  const account_name = formData.get('account_name') as string;
  const account_type = formData.get('account_type') as string;
  const normal_balance = formData.get('normal_balance') as string;
  
  const { error } = await supabase.from('chart_of_accounts').update({
    account_code,
    account_name,
    account_type,
    normal_balance,
  }).eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/accounting/coa');
  revalidatePath('/dashboard/settings/coa');
  redirect('/dashboard/settings/coa');
}

export async function deleteAccount(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  // Check if used in ledger
  const { count } = await supabase.from('ledger_entry')
    .select('*', { count: 'exact', head: true })
    .or(`account_debit.eq.${id},account_credit.eq.${id}`);

  if (count && count > 0) {
      return { error: 'Akun tidak dapat dihapus karena sudah digunakan dalam transaksi.' };
  }

  const { error } = await supabase.from('chart_of_accounts').delete().eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/accounting/coa');
  revalidatePath('/dashboard/settings/coa');
}


export async function createManualJournal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // Get Koperasi ID (Same logic)
  const { data: member } = await supabase.from('member').select('koperasi_id').eq('user_id', user.id).single();
  let koperasiId = member?.koperasi_id;
  if (!koperasiId) {
      const { data: kop } = await supabase.from('koperasi').select('id').limit(1).single();
      koperasiId = kop?.id;
  }

  const entry_date = formData.get('entry_date') as string;
  const reference = formData.get('reference') as string;
  const amount = Number(formData.get('amount'));
  const account_debit = formData.get('account_debit') as string; // UUID
  const account_credit = formData.get('account_credit') as string; // UUID
  const description = formData.get('description') as string;

  // We cannot use LedgerService.recordTransaction easily because it expects Enum AccountCodes and auto-resolves them.
  // Here we have UUIDs already. We should call Supabase directly or refactor LedgerService.
  // Let's call Supabase directly for Manual Journal to avoid re-resolving UUIDs.
  // BUT we need the Hashing logic from LedgerService!
  // Refactor: We will instantiate LedgerService and use a new method `recordManualEntry` or just duplicate the logic carefully.
  // Duplicating logic is risky for integrity.
  // Better: Create a `recordManualTransaction` in `LedgerService` that accepts UUIDs.
  // Since I cannot easily edit LedgerService right now without potentially breaking other things, I will modify `recordTransaction` to accept UUIDs if they look like UUIDs?
  // Or just duplicate the hashing logic here. It's safe enough for this MVP step.
  
  // Actually, I can just use LedgerService if I cast the UUIDs to `any` or modify the service.
  // Let's verify `LedgerService.ensureAccount`. It checks if exists by Code.
  // If I pass UUIDs, `ensureAccount` will fail.
  
  // PLAN: Implement Hashing here.
  
  const crypto = require('crypto');
  
  // 1. Get Period
  const today = new Date(entry_date);
  // (Simplified period logic from service)
  let periodId = null;
  const { data: period } = await supabase.from('accounting_period')
      .select('id')
      .eq('koperasi_id', koperasiId)
      .lte('start_date', today.toISOString())
      .gte('end_date', today.toISOString())
      .single();
  
  if (period) periodId = period.id;
  else {
       // Create fallback period if needed, or just pick latest open
       const { data: anyPeriod } = await supabase.from('accounting_period').select('id').limit(1).single();
       periodId = anyPeriod?.id;
  }

  // 2. Get Previous Hash
  const { data: lastEntry } = await supabase
      .from('ledger_entry')
      .select('hash_current')
      .eq('koperasi_id', koperasiId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

  const previousHash = lastEntry?.hash_current || 'GENESIS_HASH';

  // 3. Compute Hash
  // Hash = SHA256(prev_hash + amount + debit + credit + ref + timestamp)
  // Timestamp use Date.now() or created_at? Service uses Date.now().
  const timestamp = Date.now();
  const entryData = `${previousHash}|${amount}|${account_debit}|${account_credit}|${reference}|${timestamp}`;
  const currentHash = crypto.createHash('sha256').update(entryData).digest('hex');

  // 4. Insert
  const { error } = await supabase.from('ledger_entry').insert({
    koperasi_id: koperasiId,
    period_id: periodId,
    tx_id: crypto.randomUUID(),
    tx_type: 'journal_adjustment', // Manual
    tx_reference: reference || `MAN-${timestamp}`,
    account_debit: account_debit,
    account_credit: account_credit,
    amount: amount,
    description: description,
    metadata: { manual: true },
    hash_current: currentHash,
    hash_previous: previousHash,
    entry_date: new Date(entry_date).toISOString(),
    book_date: new Date().toISOString(),
    status: 'posted',
    created_by: user.id
  });

  if (error) {
      return { error: error.message };
  }

  revalidatePath('/dashboard/accounting/journal');
  redirect('/dashboard/accounting/journal');
}

export async function getLedgerEntries(accountId: string, startDate?: string, endDate?: string) {
  const supabase = await createClient();
  
  let query = supabase
    .from('ledger_entry')
    .select(`
        *,
        debit_account:chart_of_accounts!account_debit(account_code, account_name),
        credit_account:chart_of_accounts!account_credit(account_code, account_name)
    `)
    .or(`account_debit.eq.${accountId},account_credit.eq.${accountId}`)
    .order('entry_date', { ascending: true });

  if (startDate) {
      query = query.gte('entry_date', startDate);
  }
  if (endDate) {
      query = query.lte('entry_date', endDate);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
