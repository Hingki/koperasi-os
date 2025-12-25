const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const migrationFile = path.join(__dirname, '../supabase/migrations/20251224100000_fix_function_search_paths.sql');

if (!fs.existsSync(migrationFile)) {
    console.error(`Migration file not found: ${migrationFile}`);
    process.exit(1);
}

const sql = fs.readFileSync(migrationFile, 'utf8');

const client = new Client({
  connectionString: process.env.DATABASE_URL.replace('db.jppyqrxoswkhlnzuokwm.supabase.co', '[2406:da18:243:741d:2581:e0da:1d7f:3ec]'),
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to database.');
    console.log(`Applying migration from ${path.basename(migrationFile)}...`);
    await client.query(sql);
    console.log('Migration applied successfully.');
  } catch (err) {
    console.error('Error applying migration:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
