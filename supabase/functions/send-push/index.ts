import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Payload = {
  user_ids?: string[]
  tokens?: string[]
  title: string
  body: string
  data?: Record<string, string>
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY') || ''

async function sendFCMBatch(tokens: string[], notification: { title: string; body: string }, data?: Record<string, string>) {
  if (!tokens.length) return { ok: true }
  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify({
      registration_ids: tokens,
      notification,
      data: data || {},
      priority: 'high',
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, status: res.status, json }
  return { ok: true, json }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  try {
    const { user_ids = [], tokens = [], title, body, data } = (await req.json()) as Payload
    if (!title || !body) return new Response(JSON.stringify({ error: 'Missing title/body' }), { status: 400 })

    const targetTokens = new Set(tokens)
    if (user_ids.length) {
      const { data: rows } = await supabase
        .from('device_tokens')
        .select('token')
        .in('user_id', user_ids)
      ;(rows || []).forEach((r: any) => targetTokens.add(r.token))
    }
    const batch = Array.from(targetTokens)
    if (batch.length === 0) return new Response(JSON.stringify({ sent: 0 }))

    const result = await sendFCMBatch(batch, { title, body }, data)
    return new Response(JSON.stringify({ sent: batch.length, result }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as any)?.message || 'unknown' }), { status: 500 })
  }
})


