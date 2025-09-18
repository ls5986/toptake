import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Simple scheduler: every run, set today's prompt for any thread where it's missing
// Uses round-robin RPC when available; otherwise picks the latest saved prompt
serve(async (_req) => {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayStr = today.toISOString().slice(0, 10)

    // Find groups missing today's prompt
    const { data: threads, error: thErr } = await supabase
      .from('chat_threads')
      .select('id, use_round_robin')
      .eq('is_group', true)
    if (thErr) throw thErr

    let assigned = 0
    for (const t of threads || []) {
      const { data: existing } = await supabase
        .from('group_prompts')
        .select('id')
        .eq('thread_id', t.id)
        .eq('prompt_date', todayStr)
        .limit(1)
      if (existing && (existing as any).length > 0) continue

      // Round-robin RPC if available
      let used = false
      try {
        if ((t as any).use_round_robin) {
          const rr = await supabase.rpc('assign_next_round_robin_prompt', { p_thread: t.id, p_date: todayStr })
          if (!rr.error) { assigned++; used = true }
        }
      } catch { /* ignore */ }

      if (!used) {
        // Fallback: take the most recently added prompt without a date
        const { data: pool } = await supabase
          .from('group_prompts')
          .select('id')
          .eq('thread_id', t.id)
          .is('prompt_date', null)
          .order('created_at', { ascending: false })
          .limit(1)
        const pick = (pool as any)?.[0]
        if (pick?.id) {
          await supabase.from('group_prompts').update({ prompt_date: todayStr }).eq('id', pick.id)
          assigned++
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, assigned }), { headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as any)?.message || 'unknown' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})


