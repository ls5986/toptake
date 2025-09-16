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

function arg(name, fallback) {
  const found = process.argv.find(a => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : fallback;
}

async function main() {
  const env = loadEnv();
  const dbUrl = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;
  if (!dbUrl) throw new Error('Missing SUPABASE_DB_URL');

  const takeId = arg('take', '');
  const promptId = arg('prompt', '');
  const date = arg('date', '');
  if (!takeId || !promptId || !date) throw new Error('Usage: --take=ID --prompt=ID --date=YYYY-MM-DD');

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  console.log('Moving take', takeId, 'to prompt', promptId, 'date', date);
  const check = await client.query('select id from public.daily_prompts where id=$1 and prompt_date=$2', [promptId, date]);
  if (check.rows.length === 0) throw new Error('Prompt/date mismatch or prompt not found');

  const before = await client.query('select id,user_id,prompt_id,prompt_date from public.takes where id=$1', [takeId]);
  console.log('Before:', before.rows);

  await client.query('update public.takes set prompt_id=$1, prompt_date=$2 where id=$3', [promptId, date, takeId]);

  const after = await client.query('select id,user_id,prompt_id,prompt_date from public.takes where id=$1', [takeId]);
  console.log('After:', after.rows);

  await client.end();
}

main().catch(e => { console.error(e); process.exit(1); });
