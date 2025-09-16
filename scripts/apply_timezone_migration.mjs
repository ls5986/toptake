import fs from 'fs';
import { Client } from 'pg';

function loadEnv() {
  const text = fs.readFileSync('.env', 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const dbUrl = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL');

  const sql = fs.readFileSync('supabase/migrations/20250916_timezone_support.sql', 'utf8');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('Applying timezone migration...');
  await client.query(sql);
  console.log('Done.');
  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
