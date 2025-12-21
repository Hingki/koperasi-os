import { createClient } from '@supabase/supabase-js';
import { seedCOA } from '../src/lib/seeders/chart-of-accounts';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  try {
    console.log('🚀 Starting COA Seeding...');

    // 1. Get Koperasi ID (Assuming Single Tenant for now or First One)
    const { data: koperasi, error } = await supabase
      .from('koperasi')
      .select('id, nama')
      .limit(1)
      .single();

    if (error || !koperasi) {
      throw new Error('No Koperasi found in database. Please create one first.');
    }

    console.log(`🏢 Target Koperasi: ${koperasi.nama} (${koperasi.id})`);

    // 2. Run Seeder
    await seedCOA(supabase, koperasi.id);

    console.log('✨ Done!');
  } catch (err: any) {
    console.error('🔴 Fatal Error:', err.message);
    process.exit(1);
  }
}

main();
