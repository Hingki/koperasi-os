'use server';

import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getUserRoles } from '@/lib/auth/roles';

export async function getExportData(
  type: 'marketplace' | 'ledger' | 'escrow',
  startDate: string,
  endDate: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !user.user_metadata?.koperasi_id) {
    throw new Error('Unauthorized: User not logged in or missing Koperasi ID');
  }

  // RBAC Check: Financial Export is HIGHLY sensitive
  const roles = await getUserRoles();
  const allowedRoles = ['admin', 'bendahara', 'ketua', 'pengurus']; // Staff NOT allowed to export bulk data
  const hasAccess = roles.some(r => allowedRoles.includes(r.role));

  if (!hasAccess) {
    throw new Error('Access Denied: Only Management can export financial data.');
  }

  const koperasiId = user.user_metadata.koperasi_id;

  // Validate dates
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  if (type === 'marketplace') {
    const { data, error } = await supabase
      .from('marketplace_transactions')
      .select(`
        id,
        created_at,
        status,
        amount,
        type,
        entity_type,
        entity_id,
        journal_id
      `)
      .eq('koperasi_id', koperasiId)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  if (type === 'ledger') {
    const { data, error } = await supabase
      .from('journal_entries')
      .select(`
        id,
        transaction_date,
        description,
        reference_id,
        created_at,
        journal_lines (
            account_id,
            debit,
            credit,
            accounts (
                code,
                name
            )
        )
      `)
      .eq('koperasi_id', koperasiId)
      .gte('transaction_date', start.toISOString())
      .lte('transaction_date', end.toISOString())
      .order('transaction_date', { ascending: false });

    if (error) throw new Error(error.message);

    // Flatten for CSV
    const flattened: any[] = [];
    data.forEach((entry: any) => {
      entry.journal_lines.forEach((line: any) => {
        flattened.push({
          journal_id: entry.id,
          date: formatDate(entry.transaction_date),
          description: entry.description,
          reference: entry.reference_id,
          account_code: line.accounts.code,
          account_name: line.accounts.name,
          debit: line.debit,
          credit: line.credit
        });
      });
    });
    return flattened;
  }

  if (type === 'escrow') {
    // Escrow movements usually tracked via specific account codes (2-1300) in ledger
    const { data: lines, error: linesError } = await supabase
      .from('journal_lines')
      .select(`
            debit,
            credit,
            journal_entries!inner (
                id,
                transaction_date,
                description,
                reference_id,
                koperasi_id
            ),
            accounts!inner (
                code,
                name
            )
        `)
      .eq('journal_entries.koperasi_id', koperasiId)
      .eq('accounts.code', '2-1300')
      .gte('journal_entries.transaction_date', start.toISOString())
      .lte('journal_entries.transaction_date', end.toISOString())
      .order('journal_entries(transaction_date)', { ascending: false });

    if (linesError) throw new Error(linesError.message);

    return lines.map((line: any) => ({
      date: formatDate(line.journal_entries.transaction_date),
      description: line.journal_entries.description,
      reference: line.journal_entries.reference_id,
      debit_in: line.credit, // Liability Credit = Increase (In)
      credit_out: line.debit, // Liability Debit = Decrease (Out)
      balance_change: line.credit - line.debit
    }));
  }

  return [];
}
