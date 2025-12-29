import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { AccountCode } from '../src/lib/types/ledger';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const accountsToSeed = [
  {
    code: AccountCode.FINANCING_RECEIVABLE,
    name: 'Piutang Pembiayaan (Murabahah)',
    type: 'asset',
    normal_balance: 'DEBIT',
    description: 'Piutang atas pembiayaan pengadaan barang untuk anggota'
  },
  {
    code: AccountCode.FINANCING_INCOME_MARGIN,
    name: 'Pendapatan Margin Pembiayaan',
    type: 'revenue',
    normal_balance: 'CREDIT',
    description: 'Pendapatan margin/keuntungan dari pembiayaan Murabahah'
  },
  {
    code: AccountCode.UNEARNED_FINANCING_INCOME,
    name: 'Pendapatan Margin Ditangguhkan',
    type: 'liability',
    normal_balance: 'CREDIT',
    description: 'Margin Murabahah yang belum diakui sebagai pendapatan'
  }
];

async function seedAccounts() {
  console.log('Seeding Financing Accounts...');

  // Get all koperasi IDs
  const { data: koperasis, error: kError } = await supabase.from('koperasi').select('id');
  if (kError) throw kError;

  for (const kop of koperasis) {
    console.log(`Processing Koperasi: ${kop.id}`);
    
    for (const acc of accountsToSeed) {
      const { data: existing } = await supabase
        .from('accounts')
        .select('id')
        .eq('koperasi_id', kop.id)
        .eq('code', acc.code)
        .single();

      if (!existing) {
        const { error } = await supabase.from('accounts').insert({
          koperasi_id: kop.id,
          code: acc.code,
          name: acc.name,
          type: acc.type,
          normal_balance: acc.normal_balance,
          description: acc.description,
          is_active: true
        });
        if (error) console.error(`Error creating ${acc.code}:`, error.message);
        else console.log(`Created ${acc.code}`);
      } else {
        console.log(`Account ${acc.code} already exists`);
      }
    }
  }
}

seedAccounts().catch(console.error);
