const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const fixtures = path.join(__dirname, '..', '..', 'tests', 'migrations', 'fixtures');
const tmp = path.join(__dirname, '..', '..', 'tests', 'migrations', 'tmp');
if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });

function copyFixture(name) {
  const src = path.join(fixtures, name);
  const dst = path.join(tmp, name);
  fs.copyFileSync(src, dst);
  return dst;
}

function run(cmd, args, opts = {}) {
  const res = cp.spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (res.error) throw res.error;
  return res;
}

// Prepare test files
const f1 = copyFixture('create_table_and_enum.sql');
const f2 = copyFixture('create_index_and_sequence.sql');

// Point MIGRATIONS_DIR to our tmp folder by running scripts with cwd
const scripts = path.join(__dirname, '..', '..', 'scripts');

console.log('Running enum fixer dry-run...');
let r = run('node', [path.join(scripts, 'fix-enum-idempotency.js')], { cwd: process.cwd(), env: { ...process.env, MIGRATIONS_DIR: tmp } });
assert.ok(r.stdout.includes('Would'), 'enum fixer dry-run should report fixes or no-op');

console.log('Running enum fixer apply...');
r = run('node', [path.join(scripts, 'fix-enum-idempotency.js'), '--apply'], { cwd: process.cwd(), env: { ...process.env, MIGRATIONS_DIR: tmp } });
assert.ok(r.stdout.includes('Applied') || r.stdout.includes('No enum idempotency fixes needed.'), 'enum fixer apply ran');

console.log('Running CREATE TABLE fixer dry-run...');
r = run('node', [path.join(scripts, 'fix-create-table-idempotency.js')], { env: { ...process.env, MIGRATIONS_DIR: tmp } });
assert.ok(r.stdout.includes('Would') || r.stdout.includes('No CREATE TABLE idempotency fixes needed.'), 'table fixer dry-run ok');

console.log('Running CREATE TABLE fixer apply...');
r = run('node', [path.join(scripts, 'fix-create-table-idempotency.js'), '--apply'], { env: { ...process.env, MIGRATIONS_DIR: tmp } });
assert.ok(r.stdout.includes('Applied') || r.stdout.includes('No CREATE TABLE idempotency fixes needed.'), 'table fixer apply ok');

console.log('Running CREATE INDEX fixer dry-run...');
r = run('node', [path.join(scripts, 'fix-create-index-idempotency.js')], { env: { ...process.env, MIGRATIONS_DIR: tmp } });
assert.ok(r.stdout.includes('Would') || r.stdout.includes('No CREATE INDEX idempotency fixes needed.'), 'index fixer dry-run ok');

console.log('Running CREATE INDEX fixer apply...');
r = run('node', [path.join(scripts, 'fix-create-index-idempotency.js'), '--apply'], { env: { ...process.env, MIGRATIONS_DIR: tmp } });
assert.ok(r.stdout.includes('Applied') || r.stdout.includes('No CREATE INDEX idempotency fixes needed.'), 'index fixer apply ok');

console.log('Running CREATE SEQUENCE fixer dry-run...');
r = run('node', [path.join(scripts, 'fix-create-sequence-idempotency.js')], { env: { ...process.env, MIGRATIONS_DIR: tmp } });
assert.ok(r.stdout.includes('Would') || r.stdout.includes('No CREATE SEQUENCE idempotency fixes needed.'), 'sequence fixer dry-run ok');

console.log('Running CREATE SEQUENCE fixer apply...');
r = run('node', [path.join(scripts, 'fix-create-sequence-idempotency.js'), '--apply'], { env: { ...process.env, MIGRATIONS_DIR: tmp } });
assert.ok(r.stdout.includes('Applied') || r.stdout.includes('No CREATE SEQUENCE idempotency fixes needed.'), 'sequence fixer apply ok');

console.log('All migration fixer smoke tests passed.');
