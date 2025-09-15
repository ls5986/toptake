import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

function loadEnv(envPath) {
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let value = m[2];
    if (value?.startsWith('"') && value?.endsWith('"')) value = value.slice(1, -1);
    env[key] = value;
  }
  return env;
}

async function main() {
  const args = process.argv.slice(2);
  const userId = (args.find(a => a.startsWith('--user='))?.split('=')[1]) || '896f013a-fef5-44b1-a1a8-3707d8a5e332';

  const env = loadEnv(path.resolve(ROOT, '.env'));
  const dbUrl = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('Missing SUPABASE_DB_URL in environment or .env');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Get the user's local date (server function should exist per migrations)
  const dRes = await client.query('select public.compute_user_local_date($1, now()) as d', [userId]);
  const localDate = dRes.rows?.[0]?.d;
  if (!localDate) {
    console.error('Could not compute user local date.');
    await client.end();
    process.exit(1);
  }

  console.log('User:', userId);
  console.log('Local date:', localDate);

  const res = await client.query(
    `select id, content, is_anonymous, is_late_submit, prompt_date, created_at
     from public.takes
     where user_id = $1 and prompt_date = $2
     order by created_at asc`,
    [userId, localDate]
  );

  if (!res.rows.length) {
    console.log('No takes found for today.');
  } else {
    console.log(`Found ${res.rows.length} take(s) for today:`);
    res.rows.forEach((r, i) => {
      console.log(`[${i}] ${r.id} | late=${r.is_late_submit} | anon=${r.is_anonymous} | ${r.created_at}`);
      console.log(`     ${r.content}`);
    });
  }

  await client.end();
}

if (import.meta.stage === undefined) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
