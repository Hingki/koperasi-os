#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

function isSqlFile(file) {
  return file.endsWith('.sql');
}

function readSqlFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files.filter(isSqlFile).map(f => ({ name: f, path: path.join(MIGRATIONS_DIR, f), content: fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8') }));
}

const { parse } = (() => {
  try {
    return require('pgsql-ast-parser');
  } catch (e) {
    return { parse: null };
  }
})();

function runChecks() {
  const files = readSqlFiles();
  const errors = [];
  const warnings = [];
  const seenTimestamps = new Map();

  for (const f of files) {
    const content = f.content;
    const lower = content.toLowerCase();

    // Check 0: duplicate timestamp prefix in filenames (YYYYmmddHHMMSS_...)
    const m = f.name.match(/^(\d{14})_/);
    if (m) {
      const ts = m[1];
      if (seenTimestamps.has(ts)) {
        errors.push(`${f.name}: timestamp prefix ${ts} duplicates ${seenTimestamps.get(ts)}`);
      } else {
        seenTimestamps.set(ts, f.name);
      }
    }

    // Check 1: ARCHIVED marker must not appear in active migrations
    if (lower.includes('archived and disabled')) {
      errors.push(`${f.name}: contains "ARCHIVED and disabled" marker but is in active migrations folder`);
    }

    // Use AST parsing when available for more accurate detection
    if (parse && typeof parse === 'function') {
      try {
        const stmts = parse(content);
        for (const s of stmts) {
          const j = JSON.stringify(s).toLowerCase();
          // Detect CreateType/Create enum statements
          if (j.includes('createtype') || j.includes('create type')) {
            if (!j.includes('if not exists') && !lower.includes('select 1 from pg_type')) {
              errors.push(`${f.name}: contains CREATE TYPE without idempotency (use IF NOT EXISTS or DO IF NOT EXISTS wrapper)`);
            }
          }
          // Detect CREATE TABLE without IF NOT EXISTS
          if (j.includes('createtable') || j.includes('create table')) {
            if (!j.includes('if not exists') && !lower.includes('create table if not exists')) {
              warnings.push(`${f.name}: contains CREATE TABLE without IF NOT EXISTS (consider making it idempotent)`);
            }
          }
          // Detect partitioned table without partition key in primary key (simple heuristic)
          if (j.includes('partition by')) {
            if (!j.includes('primary key') || (j.includes('primary key') && !j.includes('book_date'))) {
              warnings.push(`${f.name}: partitioned table detected — ensure primary key includes partition key`);
            }
          }
        }
      } catch (err) {
        warnings.push(`${f.name}: SQL parse error — ${err.message}`);
      }
    } else {
      // Fallback checks when parser is not available
      // Check 2: CREATE TYPE must be idempotent (use IF NOT EXISTS)
      let idx = 0;
      while ((idx = lower.indexOf('create type', idx)) !== -1) {
        const snippet = lower.slice(idx, idx + 300);
        if (!snippet.includes('if not exists') && !lower.includes('select 1 from pg_type')) {
          errors.push(`${f.name}: contains CREATE TYPE without IF NOT EXISTS (make enum creation idempotent)`);
        }
        idx += 11;
      }

      // Check 3: CREATE TABLE without IF NOT EXISTS -> warning (may be intended)
      idx = 0;
      while ((idx = lower.indexOf('create table', idx)) !== -1) {
        const snippet = lower.slice(idx, idx + 100);
        if (!snippet.includes('if not exists')) {
          warnings.push(`${f.name}: contains CREATE TABLE without IF NOT EXISTS (consider making it idempotent)`);
        }
        idx += 12;
      }
    }

    // Check 4: Check for open grants/policies to anon
    // Allow per-file opt-out with comment: -- MIGRATION-LINTER: allow-anon
    if ((lower.includes(' to anon') || lower.includes('to anon;')) && !/migration-linter:\s*allow-anon/i.test(content)) {
      warnings.push(`${f.name}: grants or policies to role 'anon' detected (review for overly-permissive access)`);
    }
  }

  if (errors.length) {
    console.error('Migration linter found ERRORS:');
    for (const e of errors) console.error('- ' + e);
    process.exitCode = 2;
  }

  if (warnings.length) {
    console.warn('Migration linter found WARNINGS:');
    for (const w of warnings) console.warn('- ' + w);
  }

  if (!errors.length) {
    console.log('Migration linter: OK');
  }
}

runChecks();
