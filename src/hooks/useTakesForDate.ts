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
        const dateStr = date.toISOString().split('T')[0];
        const args: any = { p_date: dateStr };
        if (before) args.p_before_created_at = before;
        console.log('[useTakesForDate] fetch', { dateStr, before })
        const { data, error } = await supabase
          .rpc('get_takes_for_date', args);
        if (error) {
          console.error('[useTakesForDate] error', error);
          throw error;
        }
        console.log('[useTakesForDate] received', (data as any)?.length)
        const formatted: FormattedTake[] = (data as RpcTakeRow[] || []).map((t) => ({
          id: t.id,
          userId: t.user_id,
          content: t.content,
          username: t.is_anonymous ? 'Anonymous' : (t.username || 'Unknown'),
          isAnonymous: t.is_anonymous,
          timestamp: t.created_at,
          prompt_date: t.prompt_date,
          commentCount: t.comment_count || 0,
          reactionCount: t.reaction_count || 0,
        }));
        if (!cancelled) {
          if (before) {
            // append with dedupe by id
            setTakes(prev => {
              const seen = new Set(prev.map(t => t.id));
              const appended = formatted.filter(t => !seen.has(t.id));
              return [...prev, ...appliedOrder(appended)];
            });
          } else {
            setTakes(formatted);
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


