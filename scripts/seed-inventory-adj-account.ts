
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('--- Seeding Account 5-1102 (Inventory Adjustment) ---');

    // 1. Get Koperasi
    const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
    if (!koperasi) {
        console.error('No Koperasi found');
        process.exit(1);
    }
    console.log(`Koperasi ID: ${koperasi.id}`);

    const code = '5-1102';
    const name = 'Selisih Stok Opname';
    const type = 'expense';
    const normalBalance = 'DEBIT';

    // 2. Check if exists
    const { data: existing } = await supabase
        .from('accounts')
        .select('id, name')
        .eq('koperasi_id', koperasi.id)
        .eq('code', code)
        .single();

    if (existing) {
        console.log(`Account ${code} already exists: ${existing.name} (${existing.id})`);
    } else {
        console.log(`Creating Account ${code}...`);
        const { data: newAcc, error } = await supabase
            .from('accounts')
            .insert({
                koperasi_id: koperasi.id,
                code,
                name,
                type,
                normal_balance: normalBalance,
                is_active: true,
                description: 'Penyesuaian nilai persediaan dari Stock Opname'
            })
            .select()
            .single();

        if (error) {
            console.error(`Failed to create account: ${error.message}`);
        } else {
            console.log(`Account Created: ${newAcc.id}`);
        }
    }
}

main().catch(console.error);
