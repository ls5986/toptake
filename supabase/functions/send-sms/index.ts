import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type SmsPayload = { user_id: string; message: string }

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const TWILIO_SID = Deno.env.get('TWILIO_ACCOUNT_SID') || ''
const TWILIO_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') || ''
const TWILIO_MSID = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') || ''

async function sendSMS(toE164: string, body: string) {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
    },
    body: new URLSearchParams({
      To: toE164,
      MessagingServiceSid: TWILIO_MSID,
      Body: body,
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, status: res.status, json }
  return { ok: true, json }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  try {
    const { user_id, message } = (await req.json()) as SmsPayload
    if (!user_id || !message) return new Response(JSON.stringify({ error: 'Missing user_id/message' }), { status: 400 })

    const { data: p } = await supabase
      .from('profiles')
      .select('phone_e164, sms_opt_in')
      .eq('id', user_id)
      .maybeSingle()
    const phone = (p as any)?.phone_e164
    const opt = !!(p as any)?.sms_opt_in
    if (!phone || !opt) return new Response(JSON.stringify({ sent: 0, reason: 'No phone or not opted in' }))

    const result = await sendSMS(phone, message)
    await supabase.from('sms_logs').insert({ user_id, message, status: result.ok ? 'sent' : 'error', provider_id: (result as any)?.json?.sid || null })
    return new Response(JSON.stringify({ ok: result.ok, result }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as any)?.message || 'unknown' }), { status: 500 })
  }
})


