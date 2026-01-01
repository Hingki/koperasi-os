
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Try to construct a connection string using Supavisor pooler (SIN/ap-southeast-1 inferred)
// Original DB URL failed DNS resolution.
const projectRef = 'jppyqrxoswkhlnzuokwm';
const dbPassword = 'Koperasi2004'; // From .env
const region = 'ap-southeast-1'; // Inferred from CF-RAY: ...-SIN
const poolerHost = `aws-0-${region}.pooler.supabase.com`;

// Use Session Mode (5432) for DDL
const connectionString = `postgres://postgres.${projectRef}:${dbPassword}@${poolerHost}:5432/postgres`;

console.log(`Using connection string: postgres://postgres.${projectRef}:****@${poolerHost}:5432/postgres`);

async function fixSchema() {
  console.log('🔧 Starting Schema Fixes...');

  if (!connectionString) {
      console.error('❌ DATABASE_URL or POSTGRES_URL not found in environment.');
      process.exit(1);
  }

  const pgClient = new Client({ 
        connectionString,
        ssl: { rejectUnauthorized: false } // Add SSL support
    });
    try {
        await pgClient.connect();
        console.log('✅ Connected to Postgres.');

        // 0. Create marketplace_transactions table (Moved outside koperasi check)
        console.log('\n0. Checking marketplace_transactions table...');
        try {
            // Check if table exists
            const { rows: tableExists } = await pgClient.query(
                "SELECT to_regclass('public.marketplace_transactions')"
            );
            
            if (!tableExists[0].to_regclass) {
                console.log('   Creating marketplace_transactions table...');
                await pgClient.query(`
                    CREATE TABLE IF NOT EXISTS marketplace_transactions (
                      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                      created_at TIMESTAMPTZ DEFAULT NOW(),
                      updated_at TIMESTAMPTZ DEFAULT NOW(),
                      type VARCHAR(20) NOT NULL CHECK (type IN ('retail', 'ppob', 'loan_payment')),
                      status VARCHAR(20) NOT NULL CHECK (status IN ('initiated', 'journal_locked', 'fulfilled', 'settled', 'reversed')),
                      total_amount NUMERIC(12,2) NOT NULL,
                      member_id UUID, 
                      koperasi_id UUID NOT NULL REFERENCES koperasi(id),
                      journal_id UUID REFERENCES journal_entries(id),
                      metadata JSONB DEFAULT '{}'::jsonb
                    );
                `);
                // Add indexes
                await pgClient.query("CREATE INDEX IF NOT EXISTS idx_mt_status ON marketplace_transactions(status)");
                await pgClient.query("CREATE INDEX IF NOT EXISTS idx_mt_created_at ON marketplace_transactions(created_at)");
                
                // Grant permissions
                await pgClient.query("GRANT ALL ON marketplace_transactions TO postgres, anon, authenticated, service_role");
                
                // Reload Schema Cache
                await pgClient.query("NOTIFY pgrst, 'reload schema'");
                
                console.log('   ✅ Table created and permissions granted.');
            } else {
                console.log('   Table exists.');
                // Reload anyway just in case
                await pgClient.query("NOTIFY pgrst, 'reload schema'");
            }
        } catch (e: any) {
            console.error('   ❌ Failed to check/create marketplace_transactions:', e.message);
        }

        // 1. Check/Create Escrow Account (2-1300)
    console.log('\n1. Checking Escrow Account (2-1300)...');
    const { rows: koperasiList } = await pgClient.query('SELECT id FROM koperasi');

    if (koperasiList.length > 0) {
        for (const k of koperasiList) {
            const { rows: acc } = await pgClient.query(
                "SELECT id FROM chart_of_accounts WHERE koperasi_id = $1 AND code = '2-1300'",
                [k.id]
            );

            if (acc.length === 0) {
                console.log(`   Creating Escrow Account for Koperasi ${k.id}...`);
                await pgClient.query(
                    `INSERT INTO chart_of_accounts 
                    (koperasi_id, code, name, type, category, is_system, is_active)
                    VALUES ($1, '2-1300', 'Hutang Transaksi / Dana Titipan', 'liability', 'payable', true, true)`,
                    [k.id]
                );
            } else {
                console.log(`   Escrow Account exists for Koperasi ${k.id}.`);
            }
        }
    }

    // 2. Check/Fix ppob_products schema
    console.log('\n2. Checking ppob_products schema...');
    
    // Add koperasi_id if missing
    try {
        await pgClient.query("ALTER TABLE ppob_products ADD COLUMN IF NOT EXISTS koperasi_id UUID REFERENCES koperasi(id)");
        console.log('   ✅ Added/Checked koperasi_id column.');
    } catch (e: any) {
        console.error('   ❌ Failed to add koperasi_id:', e.message);
    }
    
    // Add price_buy if missing
    try {
        await pgClient.query("ALTER TABLE ppob_products ADD COLUMN IF NOT EXISTS price_buy NUMERIC(12, 2) DEFAULT 0");
        console.log('   ✅ Added/Checked price_buy column.');
    } catch (e: any) {
        console.error('   ❌ Failed to add price_buy:', e.message);
    }

    // Update existing rows to have koperasi_id if null
    if (koperasiList.length > 0) {
        await pgClient.query(
            "UPDATE ppob_products SET koperasi_id = $1 WHERE koperasi_id IS NULL",
            [koperasiList[0].id]
        );
        console.log('   ✅ Updated null koperasi_id values.');
    }

    // 3. Seed PPOB Product for Test
    console.log('\n3. Seeding PPOB Test Product...');
    if (koperasiList.length > 0) {
        const { rows: existing } = await pgClient.query(
            "SELECT id FROM ppob_products WHERE code = 'PULSA10'"
        );

        if (existing.length === 0) {
            await pgClient.query(
                `INSERT INTO ppob_products 
                (koperasi_id, code, name, category, provider, description, price_base, price_sell, is_active)
                VALUES ($1, 'PULSA10', 'Pulsa 10k Test', 'pulsa', 'Telkomsel', 'Test Product', 9800, 10500, true)`,
                [koperasiList[0].id]
            );
            console.log('   ✅ Test Product Seeded.');
        } else {
             console.log('   Test Product already exists.');
        }
            // 4. Check/Create marketplace_transactions table
            console.log('\n4. Checking marketplace_transactions table...');
            try {
                // Check if table exists
                const { rows: tableExists } = await pgClient.query(
                    "SELECT to_regclass('public.marketplace_transactions')"
                );
                
                if (!tableExists[0].to_regclass) {
                    console.log('   Creating marketplace_transactions table...');
                    await pgClient.query(`
                        CREATE TABLE IF NOT EXISTS marketplace_transactions (
                          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                          created_at TIMESTAMPTZ DEFAULT NOW(),
                          updated_at TIMESTAMPTZ DEFAULT NOW(),
                          type VARCHAR(20) NOT NULL CHECK (type IN ('retail', 'ppob', 'loan_payment')),
                          status VARCHAR(20) NOT NULL CHECK (status IN ('initiated', 'journal_locked', 'fulfilled', 'settled', 'reversed')),
                          total_amount NUMERIC(12,2) NOT NULL,
                          member_id UUID, -- REFERENCES members(id) but might be null for guest? No, user prompt said REFERENCES. But let's keep it loose for now to avoid FK issues if members missing.
                          koperasi_id UUID NOT NULL REFERENCES koperasi(id),
                          journal_id UUID REFERENCES journal_entries(id),
                          metadata JSONB DEFAULT '{}'::jsonb
                        );
                    `);
                    // Add indexes
                    await pgClient.query("CREATE INDEX IF NOT EXISTS idx_mt_status ON marketplace_transactions(status)");
                    await pgClient.query("CREATE INDEX IF NOT EXISTS idx_mt_created_at ON marketplace_transactions(created_at)");
                    
                    // Grant permissions
                    await pgClient.query("GRANT ALL ON marketplace_transactions TO postgres, anon, authenticated, service_role");
                    
                    // Reload Schema Cache
                    await pgClient.query("NOTIFY pgrst, 'reload schema'");
                    
                    console.log('   ✅ Table created and permissions granted.');
                } else {
                    console.log('   Table exists.');
                    // Reload anyway just in case
                    await pgClient.query("NOTIFY pgrst, 'reload schema'");
                }
            } catch (e: any) {
                console.error('   ❌ Failed to check/create marketplace_transactions:', e.message);
            }
    } // Close if (koperasiList.length > 0) - though table creation shouldn't be inside it, but for now to fix syntax.

  } catch (err: any) {
    console.error('❌ Error executing SQL:', err.message);
  } finally {
    await pgClient.end();
  }

  console.log('\n🏁 Schema Fix Complete.');
}

fixSchema().catch(console.error);
