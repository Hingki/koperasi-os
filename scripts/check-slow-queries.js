const { Client } = require('pg');
require('dotenv').config();

async function checkSlowQueries() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to database.");

    // Check extension
    const extRes = await client.query("SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements'");
    if (extRes.rows.length === 0) {
      console.log("pg_stat_statements extension not enabled. Cannot check slow queries.");
      console.log("To enable: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;");
      return;
    }

    console.log("\n--- Top 10 Slow Queries (Avg Time) ---");
    const res = await client.query(`
      SELECT 
        substring(query, 1, 100) as query_snippet,
        calls,
        round(total_exec_time::numeric / calls, 2) as avg_time_ms,
        rows,
        round(total_exec_time::numeric, 2) as total_time_ms
      FROM 
        pg_stat_statements
      WHERE 
        query NOT LIKE '%pg_stat_statements%'
      ORDER BY 
        avg_time_ms DESC
      LIMIT 10
    `);

    if (res.rows.length === 0) {
      console.log("No query stats found.");
    } else {
      console.table(res.rows);
    }

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.end();
  }
}

checkSlowQueries();
