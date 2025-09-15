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

function parseYMD(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function* eachDate(start, end) {
  const d = new Date(start.getTime());
  d.setHours(0,0,0,0);
  const e = new Date(end.getTime());
  e.setHours(0,0,0,0);
  while (d <= e) {
    yield new Date(d);
    d.setDate(d.getDate() + 1);
  }
}

function fmtDateLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Prompt generation
const subjectBanks = {
  tech: ['AI assistants', 'VR headsets', 'electric cars', 'crypto', 'smart glasses', 'blockchain', 'drones', 'foldable phones', 'wearables', 'home robots'],
  apps: ['Instagram', 'TikTok', 'X', 'YouTube', 'Spotify', 'Snapchat', 'BeReal', 'Reddit', 'LinkedIn', 'Twitch'],
  culture: ['award shows', 'celebrity couples', 'reboots', 'franchises', 'remixes', 'sequels', 'true crime', 'biopics', 'reality TV', 'spoilers'],
  life: ['cooking', 'travel', 'dating apps', 'fitness trends', 'morning routines', 'coffee culture', 'minimalism', 'remote work', 'side hustles', 'self-help gurus'],
  sports: ['NFL', 'NBA', 'Premier League', 'Formula 1', 'college football', 'MLS', 'UFC', 'WNBA', 'NHL', 'MLB'],
  products: ['notification badges', 'algorithmic feeds', 'Stories', 'blue checkmarks', 'read receipts', 'dark mode', 'autoplay', 'push alerts', 'infinite scroll', 'default filters'],
};

const templates = [
  () => `Pitch a movie that shouldn’t work but somehow does.`,
  () => `Kill one beloved feature tomorrow—what and why?`,
  () => `Name a “common sense” rule we should break more often—and defend it.`,
  () => `Pick a 2025 trend that will look embarrassing in two years. Why?`,
  () => `Drop a food take that always starts a fight—and defend it.`,
  () => `Which ${pick('apps')} feature would you remove today, and what improves?`,
  () => `Unpopular opinion: ${pick('tech')} are overrated. Convince us.`,
  () => `Fix ${pick('apps')} with one bold change.`,
  () => `Make a 2026 prediction you’d bet your own money on.`,
  () => `What’s the last “upgrade” in tech that made things worse?`,
  () => `What should ${pick('sports')} copy from ${pick('sports')}—and why?`,
  () => `Call out a cultural habit we pretend to like but don’t—and why.`,
  () => `Ban one buzzword forever. Which one and why?`,
  () => `Choose a feature to steal from ${pick('apps')} and put into ${pick('apps')}.`,
  () => `Which ${pick('products')} should never have shipped? Explain.`,
  () => `A franchise that needs to end—now. Which one and why?`,
  () => `Say one nice thing about something you usually dislike.`,
  () => `Defend a take you’ll probably get roasted for.`,
  () => `What’s a “beloved classic” that doesn’t hold up?`,
  () => `Replace a daily habit with a weirder one that works better.`,
];

function pick(bank) {
  const arr = subjectBanks[bank];
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePrompt(index) {
  // Rotate templates for variety
  const fn = templates[index % templates.length];
  return fn();
}

async function insertDailyPrompt(client, prompt_date, prompt_text) {
  // Check existing
  const existsRes = await client.query('select id from public.daily_prompts where prompt_date = $1 limit 1', [prompt_date]);
  if (existsRes.rows.length) {
    return { skipped: true };
  }
  const insertRes = await client.query(
    `insert into public.daily_prompts (prompt_text, prompt_date, category, source, is_active)
     values ($1, $2, $3, $4, $5) returning id`,
    [prompt_text, prompt_date, 'general', 'ai', true]
  );
  return { id: insertRes.rows[0]?.id };
}

async function main() {
  const args = process.argv.slice(2);
  const startArg = args.find(a => a.startsWith('--start='))?.split('=')[1] || '2025-09-15';
  const endArg = args.find(a => a.startsWith('--end='))?.split('=')[1] || '2025-12-31';

  const env = loadEnv(path.resolve(ROOT, '.env'));
  const dbUrl = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('Missing SUPABASE_DB_URL in environment or .env');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let i = 0;
  let inserted = 0;
  let skipped = 0;

  for (const d of eachDate(parseYMD(startArg), parseYMD(endArg))) {
    const dateStr = fmtDateLocal(d);
    const prompt = generatePrompt(i++);
    try {
      const res = await insertDailyPrompt(client, dateStr, prompt);
      if (res.skipped) {
        skipped++;
        console.log(`[skip] ${dateStr} already exists`);
      } else {
        inserted++;
        console.log(`[ok]   ${dateStr} -> ${res.id} :: ${prompt}`);
      }
    } catch (e) {
      console.error(`[err]  ${dateStr}`, e?.message || e);
    }
  }

  console.log(`Done. Inserted: ${inserted}, Skipped: ${skipped}`);
  await client.end();
}

if (import.meta.stage === undefined) {
  // Just run when invoked directly
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
