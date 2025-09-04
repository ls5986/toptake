import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple client event logger to Supabase
import { supabase } from '@/lib/supabase';
let eventLogsChecked = false;
let eventLogsAvailable = true;
export async function logClientEvent(eventType: string, payload?: Record<string, any>) {
  try {
    if (!eventLogsChecked) {
      eventLogsChecked = true;
      const probe: any = await supabase.from('event_logs').select('id', { head: true, count: 'exact' });
      if (probe?.error) eventLogsAvailable = false;
    }
    if (!eventLogsAvailable) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('event_logs').insert({
      user_id: user?.id || null,
      event_type: eventType,
      payload: payload || {}
    });
  } catch (e) {
    // no-op in client
  }
}

// Lightweight in-memory + localStorage cache for small lookups (e.g., prompt of the day)
type CacheEntry<T> = { value: T; expiresAt: number };
const memoryCache: Record<string, CacheEntry<any>> = {};
const DEFAULT_TTL_MS = 60_000; // 60s; small to prevent stale UI

function getFromMemory<T>(key: string): T | null {
  const entry = memoryCache[key];
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { delete memoryCache[key]; return null; }
  return entry.value as T;
}

function setMemory<T>(key: string, value: T, ttlMs: number = DEFAULT_TTL_MS) {
  memoryCache[key] = { value, expiresAt: Date.now() + ttlMs };
}

export async function fetchPromptForDateCached(dateStr: string): Promise<string> {
  const key = `prompt:${dateStr}`;
  const mem = getFromMemory<string>(key);
  if (mem !== null && mem !== undefined) return mem;
  try {
    const ls = localStorage.getItem(key);
    if (ls) {
      try { const parsed = JSON.parse(ls); if (parsed && parsed.value && parsed.expiresAt > Date.now()) { setMemory(key, parsed.value, parsed.expiresAt - Date.now()); return parsed.value; } } catch {}
    }
  } catch {}

  // fetch
  const { data } = await supabase
    .from('daily_prompts')
    .select('prompt_text')
    .eq('prompt_date', dateStr)
    .maybeSingle();
  const promptText = data?.prompt_text || '';
  setMemory(key, promptText);
  try { localStorage.setItem(key, JSON.stringify({ value: promptText, expiresAt: Date.now() + DEFAULT_TTL_MS })); } catch {}
  return promptText;
}

// Follow stats micro-cache (defaults to 30s)
type FollowStats = { followers_count: number; following_count: number; is_following: boolean };
export async function fetchFollowStatsCached(viewerId: string | null, targetUserId: string, ttlMs: number = 30_000): Promise<FollowStats> {
  const key = `followstats:${viewerId || 'anon'}:${targetUserId}`;
  const mem = getFromMemory<FollowStats>(key);
  if (mem) return mem;
  try {
    const ls = localStorage.getItem(key);
    if (ls) {
      const parsed = JSON.parse(ls);
      if (parsed && parsed.value && parsed.expiresAt > Date.now()) {
        setMemory(key, parsed.value, parsed.expiresAt - Date.now());
        return parsed.value as FollowStats;
      }
    }
  } catch {}

  const { data } = await supabase.rpc('get_follow_stats', { p_viewer: viewerId, p_target: targetUserId });
  const stats: FollowStats = data && data[0]
    ? { followers_count: data[0].followers_count || 0, following_count: data[0].following_count || 0, is_following: !!data[0].is_following }
    : { followers_count: 0, following_count: 0, is_following: false };
  setMemory(key, stats, ttlMs);
  try { localStorage.setItem(key, JSON.stringify({ value: stats, expiresAt: Date.now() + ttlMs })); } catch {}
  return stats;
}
