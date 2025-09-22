import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface RpcTakeRow {
  id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  prompt_date: string;
  username: string | null;
  comment_count: number;
  reaction_count: number;
}

interface FormattedTake {
  id: string;
  userId: string;
  content: string;
  username: string;
  isAnonymous: boolean;
  timestamp: string;
  prompt_date: string;
  commentCount: number;
  reactionCount?: number;
}

function formatLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Simple in-memory inflight and cache map
const takesInflight: Record<string, Promise<any>> = {};

export function useTakesForDate(date: Date) {
  const [takes, setTakes] = useState<FormattedTake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [before, setBefore] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const dateStr = formatLocalYMD(date);
        const cacheKey = `takes:${dateStr}`;
        try {
          const ls = localStorage.getItem(cacheKey);
          if (ls && !before) {
            const parsed = JSON.parse(ls);
            if (parsed && parsed.expiresAt > Date.now() && Array.isArray(parsed.value)) {
              setTakes(parsed.value);
              setLoading(false);
            }
          }
        } catch {}

        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id || null;

        // Primary: RPC (server-side local date logic and pagination)
        const args: any = { p_user_id: userId, p_date: dateStr };
        if (before) args.p_before_created_at = before;
        console.log('[useTakesForDate] fetch', { dateStr, before })
        let data: RpcTakeRow[] | null = null;
        if (!before && takesInflight[cacheKey]) {
          // De-dupe concurrent first-page fetches
          try {
            data = await takesInflight[cacheKey];
          } catch {
            data = null;
          }
        } else {
          try {
            const promise = supabase.rpc('get_takes_for_date', { ...args, p_limit: before ? 50 : 100 });
            if (!before) takesInflight[cacheKey] = promise as any;
            const rpc = await promise;
            if (rpc.error) throw rpc.error;
            data = (rpc.data as RpcTakeRow[]) || [];
          } catch (e) {
            console.warn('[useTakesForDate] RPC failed, will try fallback', e);
            data = null;
          } finally {
            if (!before) delete takesInflight[cacheKey];
          }
        }

        // Fallback: direct query if RPC empty or failed
        if (!data || data.length === 0) {
          try {
            const qb = supabase
              .from('takes')
              .select('id, user_id, content, is_anonymous, created_at, prompt_date, profiles:user_id(username)')
              .eq('prompt_date', dateStr)
              .order('created_at', { ascending: false });
            // RLS will ensure we only see public or own; to encourage seeing own, no extra filter
            const { data: rows, error: qErr } = await qb;
            if (qErr) throw qErr;
            data = (rows as any[]).map((t: any) => ({
              id: t.id,
              user_id: t.user_id,
              content: t.content,
              is_anonymous: t.is_anonymous,
              created_at: t.created_at,
              prompt_date: t.prompt_date,
              username: t.is_anonymous ? null : (t.profiles?.username || null),
              comment_count: 0,
              reaction_count: 0,
            }));
          } catch (fe) {
            console.error('[useTakesForDate] fallback failed', fe);
            data = [] as any;
          }
        }

        console.log('[useTakesForDate] received', (data as any)?.length)
        let formatted: FormattedTake[] = (data || []).map((t) => ({
          id: t.id,
          userId: t.user_id,
          content: t.content,
          username: t.is_anonymous
            ? 'Anonymous'
            : (t.user_id === userId ? 'You' : (t.username || '')),
          isAnonymous: t.is_anonymous,
          timestamp: t.created_at,
          prompt_date: t.prompt_date,
          commentCount: t.comment_count || 0,
          reactionCount: t.reaction_count || 0,
        }));

        const missingUserIds = Array.from(new Set(
          (data || [])
            .filter(t => !t.is_anonymous && (!t.username || (t as any).username?.toLowerCase?.() === 'unknown'))
            .map(t => t.user_id)
        ));
        if (missingUserIds.length) {
          try {
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username')
              .in('id', missingUserIds);
            const map = new Map<string,string>((profiles||[]).map(p => [p.id, p.username]));
            formatted = formatted.map(t => (
              (!t.isAnonymous && (!t.username || t.username.toLowerCase() === 'unknown'))
                ? { ...t, username: (t.userId === userId ? 'You' : (map.get(t.userId) || '')) }
                : t
            ));
          } catch {}
        }

        // Ensure the viewer's own take appears even if main query misses it (RLS, replication, or cache)
        if (userId) {
          try {
            const { data: myRow } = await supabase
              .from('takes')
              .select('id, user_id, content, is_anonymous, created_at, prompt_date, profiles:user_id(username)')
              .eq('user_id', userId)
              .eq('prompt_date', dateStr)
              .maybeSingle();
            if (myRow) {
              const exists = formatted.some(t => t.id === myRow.id);
              if (!exists) {
                const myFormatted: FormattedTake = {
                  id: myRow.id,
                  userId: myRow.user_id,
                  content: myRow.content,
                  username: myRow.is_anonymous ? 'Anonymous' : 'You',
                  isAnonymous: myRow.is_anonymous,
                  timestamp: myRow.created_at,
                  prompt_date: myRow.prompt_date,
                  commentCount: 0,
                  reactionCount: 0,
                };
                formatted = [myFormatted, ...formatted];
              }
            }
          } catch {}
        }
        if (!cancelled) {
          if (before) {
            setTakes(prev => {
              const seen = new Set(prev.map(t => t.id));
              const appended = formatted.filter(t => !seen.has(t.id));
              return [...prev, ...appliedOrder(appended)];
            });
          } else {
            setTakes(formatted);
            // Cache for 5 minutes
            try { localStorage.setItem(cacheKey, JSON.stringify({ value: formatted, expiresAt: Date.now() + 5 * 60 * 1000 })); } catch {}
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load takes');
        if (!cancelled) setTakes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [date, before]);

  return { takes, loading, error, setBefore };
}

function appliedOrder<T>(items: T[]): T[] {
  return items; // placeholder to keep consistent order if needed later
}


