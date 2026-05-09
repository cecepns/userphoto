const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const ORDER_FILE = path.join(MIGRATIONS_DIR, 'run_order.txt');

const DUP_COLUMN = 1060;
const DUP_KEYNAME = 1061;

function stripSqlComments(sql) {
  return sql
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (t.startsWith('--')) return '';
      const idx = line.indexOf('--');
      if (idx === -1) return line;
      return line.slice(0, idx);
    })
    .join('\n');
}

function splitStatements(sql) {
  const cleaned = stripSqlComments(sql);
  return cleaned
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

async function ensureMigrationsTable(pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function isApplied(pool, name) {
  const [rows] = await pool.execute(
    'SELECT 1 FROM schema_migrations WHERE name = ? LIMIT 1',
    [name]
  );
  return rows.length > 0;
}

async function recordApplied(pool, name) {
  await pool.execute('INSERT INTO schema_migrations (name) VALUES (?)', [name]);
}

function readOrderedMigrationFiles() {
  if (!fs.existsSync(ORDER_FILE)) {
    throw new Error(`Missing ${ORDER_FILE}`);
  }
  const text = fs.readFileSync(ORDER_FILE, 'utf8');
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

async function runStatement(pool, statement) {
  try {
    await pool.query(statement);
  } catch (err) {
    const errno = err.errno || err.code;
    if (errno === DUP_KEYNAME || errno === DUP_COLUMN) {
      console.warn(`[migrations] skip duplicate (errno ${errno}): ${statement.slice(0, 80)}...`);
      return;
    }
    throw err;
  }
}

/**
 * Menjalankan file migrasi SQL (beberapa statement dipisah ';').
 * @param {import('mysql2/promise').Pool} pool
 * @param {string} filename
 */
async function runMigrationFile(pool, filename) {
  const full = path.join(MIGRATIONS_DIR, filename);
  if (!fs.existsSync(full)) {
    throw new Error(`Migration file not found: ${filename}`);
  }
  const sql = fs.readFileSync(full, 'utf8');
  const statements = splitStatements(sql);
  for (const stmt of statements) {
    await runStatement(pool, `${stmt};`);
  }
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @param {{ silent?: boolean }} [opts]
 */
async function runMigrations(pool, opts = {}) {
  const silent = opts.silent === true;
  await ensureMigrationsTable(pool);
  const files = readOrderedMigrationFiles();

  for (const file of files) {
    if (file === 'run_order.txt') continue;
    if (await isApplied(pool, file)) {
      if (!silent) console.log(`[migrations] skip (already applied): ${file}`);
      continue;
    }
    if (!silent) console.log(`[migrations] applying: ${file}`);
    await runMigrationFile(pool, file);
    await recordApplied(pool, file);
    if (!silent) console.log(`[migrations] done: ${file}`);
  }
}

module.exports = {
  runMigrations,
  runMigrationFile,
  MIGRATIONS_DIR,
};
