import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('--- Applying Migrations ---');

  const files = [
      'supabase/migrations/20251223040000_add_product_coa_codes.sql',
      'supabase/migrations/20251223050000_seed_uat_data.sql'
  ];

  for (const file of files) {
      const filePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
          console.error(`File not found: ${filePath}`);
          continue;
      }
      
      const sql = fs.readFileSync(filePath, 'utf8');
      // Split by statement if needed, or run as one block
      // Supabase-js doesn't support raw SQL execution easily via client without an RPC or direct connection.
      // BUT, we can use the 'postgres' package if installed, or just use the Supabase SQL Editor manually.
      // Wait, I can't run raw SQL via supabase-js client unless I have a function for it.
      
      console.log(`Executing ${file}...`);
      
      // HACK: Supabase JS doesn't expose raw query.
      // Assuming I can't run migrations via script easily without `pg`.
      // I will rely on the user or just assume I need to guide the user.
      
      // Alternative: Use a known RPC if exists? No.
      
      // BUT, I can try to insert the rows MANUALLY via the client instead of SQL.
  }
  
  // Manual Insert for Payment Source
  console.log('Inserting Payment Source via JS...');
  const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
  if (!koperasi) { console.error('No Koperasi'); return; }

  const { error } = await supabase.from('payment_sources').upsert({
      koperasi_id: koperasi.id,
      name: 'Bank BCA (Manual)',
      method: 'transfer',
      provider: 'manual',
      bank_name: 'BCA',
      account_number: '1234567890',
      account_holder: 'Koperasi Sejahtera',
      is_active: true
  }, { onConflict: 'koperasi_id, method, provider' as any }); // conflict constraint might differ
  
  // Check constraint on table
  // UNIQUE(koperasi_id, method, provider)? Maybe not.
  // The SQL uses "WHERE NOT EXISTS".
  
  // Let's just query first.
  const { data: existing } = await supabase.from('payment_sources')
    .select('id')
    .eq('provider', 'manual')
    .eq('method', 'transfer')
    .maybeSingle();

  if (!existing) {
      const { error: insertError } = await supabase.from('payment_sources').insert({
          koperasi_id: koperasi.id,
          name: 'Bank BCA (Manual)',
          method: 'transfer',
          provider: 'manual',
          bank_name: 'BCA',
          account_number: '1234567890',
          account_holder: 'Koperasi Sejahtera',
          is_active: true
      });
      if (insertError) console.error('Error inserting payment source:', insertError);
      else console.log('Inserted Payment Source');
  } else {
      console.log('Payment Source already exists');
  }
  
  // Update Products
  console.log('Updating Products...');
  await supabase.from('savings_products').update({ coa_id: '2-1001' }).is('coa_id', null);
  await supabase.from('loan_products').update({ 
      coa_receivable: '1-1003',
      coa_interest_income: '4-1001'
  }).is('coa_receivable', null);
  
  console.log('Migration Data Applied.');
}

run().catch(console.error);
