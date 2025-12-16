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

function wrapEnum(name, enumBody) {
  return `DO $$\nBEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN\n    ${enumBody}\n  END IF;\nEND$$;\n`;
}

function unquoteIdentifier(ident) {
  // Remove surrounding double quotes if present and unescape internal doubled quotes
  if (!ident) return ident;
  ident = ident.trim();
  if (ident.startsWith('"') && ident.endsWith('"')) {
    const inner = ident.slice(1, -1);
    return inner.replace(/""/g, '"');
  }
  return ident;
}

function runFixes(dryRun = true) {
  const files = readSqlFiles();
  const fixes = [];

  for (const f of files) {
    let newContent = f.content;
    // Regex to find CREATE TYPE statements, including quoted and schema-qualified names
    const regex = /create\s+type\s+((?:(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*)(?:\s*\.\s*(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*))?))\s+as\s+enum\s*\(((?:[^)]|\n)+?)\)\s*;/ig;
    let m;
    // iterate over all matches in the file
    while ((m = regex.exec(newContent)) !== null) {
      const fullName = m[1];
      const body = m[0];
      // derive unqualified type name (strip schema if present)
      const parts = fullName.split('.').map(p => p.trim());
      const rawName = parts[parts.length - 1];
      const typeName = unquoteIdentifier(rawName).replace(/"/g, '');

      // Skip if there's already an idempotent check for this type
      const existsCheckRegex = new RegExp("IF\\s+NOT\\s+EXISTS\\s*\\(\\s*SELECT\\s+1\\s+FROM\\s+pg_type\\s+WHERE\\s+typname\\s*=\\s*'" + typeName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + "'","i");
      if (existsCheckRegex.test(newContent)) {
        continue;
      }

      const replacement = wrapEnum(typeName, body);
      // Use function replacement to avoid `$`-expansion in replacement strings
      newContent = newContent.replace(body, () => replacement);
      fixes.push({ file: f.name, name: typeName });
      // continue scanning to catch multiple enums per file
      regex.lastIndex = 0; // reset because we modified newContent
    }

    if (newContent !== f.content) {
      if (dryRun) {
        console.log(`Would fix enum idempotency in ${f.name}`);
      } else {
        fs.copyFileSync(f.path, f.path + '.bak');
        fs.writeFileSync(f.path, newContent, 'utf8');
        console.log(`Applied fix to ${f.name} (backup created at ${f.name}.bak)`);
      }
    }
  }

  if (!fixes.length) console.log('No enum idempotency fixes needed.');
}

const args = process.argv.slice(2);
const dry = !(args.includes('--apply') || args.includes('-a'));
runFixes(dry);
