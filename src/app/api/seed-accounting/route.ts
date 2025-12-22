import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
     // For seeding, we might allow public or require auth. Let's assume dev mode.
     // return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Create Koperasi if not exists
  let koperasiId;
  const { data: existingKop } = await supabase.from('koperasi').select('id').limit(1).single();
  
  if (existingKop) {
    koperasiId = existingKop.id;
  } else {
    // Attempt insert with standard fields
    console.log('Attempting to create Koperasi...');
    const { data: newKop, error: errKop } = await supabase.from('koperasi').insert([{
        name: 'Koperasi Sejahtera',
        address: 'Jl. Merdeka No. 1',
        status: 'active'
    }]).select().single();
    
    if (errKop) {
        console.error('Failed to create koperasi:', errKop);
        return Response.json({ error: 'Failed to create koperasi', details: errKop }, { status: 500 });
    }
    koperasiId = newKop.id;
  }

  // 2. Seed Chart of Accounts
  const accounts = [
    // Assets
    { code: '1-1-1-01', name: 'Kas Besar', type: 'asset', normal: 'debit' },
    { code: '1-1-2-01', name: 'Piutang Usaha', type: 'asset', normal: 'debit' },
    { code: '1-2-1-01', name: 'Inventaris Kantor', type: 'asset', normal: 'debit' },
    
    // Liabilities
    { code: '2-1-1-01', name: 'Utang Usaha', type: 'liability', normal: 'credit' },
    { code: '2-2-1-01', name: 'Utang Bank', type: 'liability', normal: 'credit' },
    
    // Equity
    { code: '3-1-0-01', name: 'Simpanan Pokok', type: 'equity', normal: 'credit' },
    { code: '3-1-0-02', name: 'Simpanan Wajib', type: 'equity', normal: 'credit' },
    { code: '3-2-0-01', name: 'SHU Tahun Lalu', type: 'equity', normal: 'credit' },
    
    // Revenue
    { code: '4-1-0-01', name: 'Pendapatan Jasa', type: 'revenue', normal: 'credit' },
    { code: '4-2-0-01', name: 'Pendapatan Lain-lain', type: 'revenue', normal: 'credit' },
    
    // Expenses
    { code: '5-1-0-01', name: 'Beban Gaji', type: 'expense', normal: 'debit' },
    { code: '5-1-0-02', name: 'Beban Listrik & Air', type: 'expense', normal: 'debit' },
  ];

  for (const acc of accounts) {
      // Check if exists
      const { data: exist } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('account_code', acc.code)
        .eq('koperasi_id', koperasiId)
        .single();
        
      if (!exist) {
          await supabase.from('chart_of_accounts').insert({
              koperasi_id: koperasiId,
              account_code: acc.code,
              account_name: acc.name,
              account_type: acc.type,
              normal_balance: acc.normal,
              is_active: true
          });
      }
  }

  return Response.json({ status: 'Seeding Completed', koperasiId });
}
