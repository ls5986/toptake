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

function getArg(name, fallback) {
  const found = process.argv.find(a => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : fallback;
}

async function main() {
  const env = loadEnv();
  const dbUrl = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL');

  const date = getArg('date', '2025-09-15');
  const user = getArg('user', '');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('Inspecting date:', date);
  const dp = await client.query(
    `select id, prompt_date::text, prompt_text, is_active, coalesce(source,'') as source
     from public.daily_prompts where prompt_date = $1`,
    [date]
  );
  console.log('daily_prompts rows:', dp.rows);

  if (user) {
    const tk = await client.query(
      `select id, user_id, prompt_id, prompt_date::text, created_at, left(content, 80) as content_preview
       from public.takes where user_id=$1 and prompt_date=$2 order by created_at`,
      [user, date]
    );
    console.log('takes rows for user:', tk.rows);
  }

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
