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

const HOLIDAY_PROMPTS = [
  { date: '2025-10-16', text: "What’s the pettiest boss rule that taught you to stop listening to bosses?" },
  { date: '2025-10-31', text: "Name a ‘scary’ classic that only works if you’ve never met Wi‑Fi." },
  { date: '2025-11-27', text: "Which side dish is just a cry for help?" },
  { date: '2025-11-28', text: "What fake ‘deal’ should get permanently cart‑abandoned?" },
  { date: '2025-12-01', text: "Name a new tech tool that’s just believable enough to exist." },
  { date: '2025-12-14', text: "Which tradition got better after we broke the rules?" },
  { date: '2025-12-24', text: "What holiday ritual is performance art with snacks?" },
  { date: '2025-12-25', text: "Which ‘beloved’ Christmas movie is just a hostage situation with tinsel?" },
  { date: '2025-12-31', text: "Which resolution trend is multilevel marketing for guilt?" },
];

async function main() {
  const env = loadEnv(path.resolve(ROOT, '.env'));
  const dbUrl = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('Missing SUPABASE_DB_URL in environment or .env');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const h of HOLIDAY_PROMPTS) {
    try {
      const existing = await client.query('select id from public.daily_prompts where prompt_date = $1 limit 1', [h.date]);
      if (existing.rows.length) {
        await client.query(
          `update public.daily_prompts
           set prompt_text = $1, category = 'general', source = 'ai', is_active = true
           where prompt_date = $2`,
          [h.text, h.date]
        );
        console.log(`[update] ${h.date} -> ${h.text}`);
      } else {
        const ins = await client.query(
          `insert into public.daily_prompts (prompt_text, prompt_date, category, source, is_active)
           values ($1, $2, 'general', 'ai', true) returning id`,
          [h.text, h.date]
        );
        console.log(`[insert] ${h.date} -> ${ins.rows[0]?.id} :: ${h.text}`);
      }
    } catch (e) {
      console.error(`[err] ${h.date}:`, e?.message || e);
    }
  }

  await client.end();
}

if (import.meta.stage === undefined) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
