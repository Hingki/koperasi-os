
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// dotenv.config();

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

async function applyMigrations() {
    // const connectionString = process.env.DATABASE_URL;
    const connectionString = 'postgresql://postgres:Koperasi2004@db.jppyqrxoswkhlnzuokwm.supabase.co:5432/postgres';
    if (!connectionString) {
        console.error('DATABASE_URL is not defined in .env');
        process.exit(1);
    }
    
    // Debug URL (mask password)
    const debugUrl = connectionString.replace(/:[^:@]+@/, ':****@');
    console.log(`Using connection string: ${debugUrl}`);

    // Adjust connection string for transaction mode if needed (Supabase usually requires it for direct connection on port 6543)
    // Or just use the provided URL.
    
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        // Get list of migrations from file system
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Ensure chronological order

        // Create migrations table if not exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS _migrations (
                name TEXT PRIMARY KEY,
                applied_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // Get applied migrations
        const { rows: appliedRows } = await client.query('SELECT name FROM _migrations');
        const applied = new Set(appliedRows.map(r => r.name));

        for (const file of files) {
            if (!applied.has(file)) {
                console.log(`Applying migration: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                
                try {
                    await client.query('BEGIN');
                    await client.query(sql);
                    await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
                    await client.query('COMMIT');
                    console.log(`Applied: ${file}`);
                } catch (err) {
                    await client.query('ROLLBACK');
                    console.error(`Failed to apply ${file}:`, err);
                    process.exit(1);
                }
            } else {
                // console.log(`Skipping already applied: ${file}`);
            }
        }

        console.log('All migrations checked/applied.');

    } catch (err) {
        console.error('Database connection error:', err);
    } finally {
        await client.end();
    }
}

applyMigrations();
