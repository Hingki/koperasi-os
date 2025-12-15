#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR || path.join(__dirname, '..', 'supabase', 'migrations');

function isSqlFile(file) { return file.endsWith('.sql'); }
function readSqlFiles() {
  const files = fs.readdirSync(MIGRATIONS_DIR);
  return files.filter(isSqlFile).map(f => ({ name: f, path: path.join(MIGRATIONS_DIR, f), content: fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8') }));
}

function runFix(dryRun = true) {
  const files = readSqlFiles();
  let did = false;
  for (const f of files) {
    const content = f.content;
    // Match CREATE SEQUENCE not followed by IF NOT EXISTS
    const regex = /(create\s+sequence\s+)(?!if\s+not\s+exists)/ig;
    if (regex.test(content)) {
      const newContent = content.replace(regex, (m) => m + 'IF NOT EXISTS ');
      if (newContent !== content) {
        did = true;
        if (dryRun) {
          console.log(`Would add IF NOT EXISTS to CREATE SEQUENCE in ${f.name}`);
        } else {
          fs.copyFileSync(f.path, f.path + '.bak');
          fs.writeFileSync(f.path, newContent, 'utf8');
          console.log(`Applied CREATE SEQUENCE idempotency fix to ${f.name} (backup at ${f.name}.bak)`);
        }
      }
    }
  }
  if (!did) console.log('No CREATE SEQUENCE idempotency fixes needed.');
}

const args = process.argv.slice(2);
const dry = !(args.includes('--apply') || args.includes('-a'));
runFix(dry);
