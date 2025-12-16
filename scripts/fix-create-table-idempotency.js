#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || path.join(__dirname, '..', 'supabase', 'migrations');

function isSqlFile(file) {
  return file.endsWith('.sql');
}

function readSqlFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files.filter(isSqlFile).map(f => ({ name: f, path: path.join(MIGRATIONS_DIR, f), content: fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8') }));
}

function runFix(dryRun = true) {
  const files = readSqlFiles();
  const fixes = [];

  for (const f of files) {
    const content = f.content;
    // Match CREATE TABLE not followed by IF NOT EXISTS
    const regex = /(^|\n)(\s*create\s+table\s+)(?!if\s+not\s+exists)([\s\S]*?\()/ig;
    let m;
    let newContent = content;
    while ((m = regex.exec(content)) !== null) {
      const full = m[0];
      const prefix = m[1];
      const createTok = m[2];
      const restStart = m[3];
      const replacement = `${prefix}${createTok}IF NOT EXISTS ${restStart}`;
      // Replace only the first occurrence in this file for this match
      newContent = newContent.replace(full, replacement);
      fixes.push({ file: f.name });
      // continue to find additional tables
    }

    if (newContent !== content) {
      if (dryRun) {
        console.log(`Would add IF NOT EXISTS to CREATE TABLE statements in ${f.name}`);
      } else {
        fs.copyFileSync(f.path, f.path + '.bak');
        fs.writeFileSync(f.path, newContent, 'utf8');
        console.log(`Applied CREATE TABLE idempotency fix to ${f.name} (backup at ${f.name}.bak)`);
      }
    }
  }

  if (!fixes.length) console.log('No CREATE TABLE idempotency fixes needed.');
}

const args = process.argv.slice(2);
const dry = !(args.includes('--apply') || args.includes('-a'));
runFix(dry);
