// Usage:
// SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed_fake_data.mjs

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function sample(arr) { return arr[Math.floor(Math.random() * arr.length)] }

const reactionTypes = ['wildTake', 'fairPoint', 'mid', 'thatYou']
const nouns = ['coffee', 'AI', 'social media', 'NFTs', 'crypto', 'gym', 'cats', 'politics', 'fashion', 'diet']
const opinions = [
  'is overrated', 'needs regulation', 'changed my life', 'is a scam',
  'is misunderstood', 'is the future', 'makes people happier', 'is toxic',
]

function randomSentence() {
  return `I think ${sample(nouns)} ${sample(opinions)}.`
}

function formatDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

async function ensureDailyPrompt(dateStr) {
  const { data, error } = await supabase
    .from('daily_prompts')
    .select('id')
    .eq('prompt_date', dateStr)
    .maybeSingle()
  if (error) throw error
  if (data) return data.id
  const { data: inserted, error: insertErr } = await supabase
    .from('daily_prompts')
    .insert({ prompt_text: `What is your take for ${dateStr}?`, prompt_date: dateStr, is_active: true })
    .select('id')
    .single()
  if (insertErr) throw insertErr
  return inserted.id
}

async function createUsers(n) {
  const users = []
  for (let i = 0; i < n; i++) {
    const username = `user_${Date.now()}_${i}`
    const email = `${username}@example.com`
    const { data: created, error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { username },
    })
    if (error) throw error
    const user = created.user
    users.push(user)
    // Insert profile row
    await supabase.from('profiles').upsert({
      id: user.id,
      username,
      is_premium: Math.random() < 0.2,
      current_streak: 0,
      longest_streak: 0,
      timezone_offset: 0,
      theme_id: Math.random() < 0.5 ? 'light' : 'dark',
    })
  }
  return users
}

async function seed({ pastDays = 5, futureDays = 5, userCount = 10, maxCommentsPerTake = 4, maxReactionsPerTake = 10 }) {
  console.log('Seeding data...')
  const users = await createUsers(userCount)
  const allUserIds = users.map(u => u.id)
  const today = new Date()
  today.setHours(0,0,0,0)

  for (let offset = -pastDays; offset <= futureDays; offset++) {
    const d = new Date(today)
    d.setDate(d.getDate() + offset)
    const dateStr = formatDate(d)
    const promptId = await ensureDailyPrompt(dateStr)
    console.log('Day', dateStr, 'prompt', promptId)

    // For each user, chance to post a take
    for (const user of users) {
      if (Math.random() < 0.6) { // 60% chance to post per day
        const content = randomSentence()
        const isAnonymous = Math.random() < 0.25
        const { data: takeRow, error: takeErr } = await supabase
          .from('takes')
          .insert({
            user_id: user.id,
            content,
            is_anonymous: isAnonymous,
            prompt_id: promptId,
            prompt_date: dateStr,
            created_at: new Date(d.getTime() + randInt(0, 23)*3600000).toISOString(),
          })
          .select('id')
          .single()
        if (takeErr && takeErr.code !== '23505') { // ignore unique dupes
          console.warn('Insert take error', takeErr)
          continue
        }
        const takeId = takeRow?.id
        if (!takeId) continue

        // Reactions from random users
        const reactioners = [...allUserIds].sort(() => 0.5 - Math.random()).slice(0, randInt(0, maxReactionsPerTake))
        for (const actorId of reactioners) {
          await supabase.from('take_reactions').upsert({
            take_id: takeId,
            actor_id: actorId,
            reaction_type: sample(reactionTypes),
            created_at: new Date().toISOString(),
          }, { onConflict: 'take_id,actor_id,reaction_type' })
        }

        // Comments from random users
        const commenters = [...allUserIds].sort(() => 0.5 - Math.random()).slice(0, randInt(0, maxCommentsPerTake))
        for (const commenterId of commenters) {
          const { data: cmt, error: cErr } = await supabase
            .from('comments')
            .insert({
              take_id: takeId,
              user_id: commenterId,
              content: randomSentence(),
              is_anonymous: Math.random() < 0.2,
            })
            .select('id')
            .single()
          if (cErr) continue
          // optional one reply thread
          if (Math.random() < 0.3) {
            const replyUser = sample(allUserIds)
            await supabase.from('comments').insert({
              take_id: takeId,
              user_id: replyUser,
              content: randomSentence(),
              is_anonymous: Math.random() < 0.2,
              parent_comment_id: cmt.id,
            })
          }
        }
      }
    }
  }
  console.log('Seeding complete.')
}

seed({}).catch(err => {
  console.error(err)
  process.exit(1)
})


