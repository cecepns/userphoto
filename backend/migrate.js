#!/usr/bin/env node
/**
 * CLI: jalankan migrasi SQL terhadap database (menggunakan config yang sama dengan server.js).
 * Usage: node migrate.js   atau   npm run migrate
 */
const mysql = require('mysql2/promise');
const { runMigrations } = require('./lib/runMigrations');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
  database: process.env.DB_NAME || 'wedding_organizer',
  waitForConnections: true,
  connectionLimit: 2,
  multipleStatements: true,
};

async function main() {
  let pool;
  try {
    pool = mysql.createPool(dbConfig);
    await runMigrations(pool, { silent: false });
    console.log('[migrations] all pending migrations applied.');
    process.exit(0);
  } catch (e) {
    console.error('[migrations] failed:', e.message);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

main();
