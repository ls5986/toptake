import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';

// Simple in-memory cache to avoid repeated fetches in one session
const promptCache: Record<string, any> = {};
const inflight: Record<string, Promise<any>> = {};

export function useTodayPrompt(targetDate?: Date) {
  const { user } = useAppContext();
  const [prompt, setPrompt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrompt() {
      setLoading(true);
      setError(null);

      const dateToUse = targetDate || new Date();
      const dateStr =
        dateToUse.getFullYear() +
        '-' +
        String(dateToUse.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(dateToUse.getDate()).padStart(2, '0');

      // Serve from cache
      if (promptCache[dateStr]) {
        if (!cancelled) {
          setPrompt((prev: any) => (prev?.id === promptCache[dateStr]?.id ? prev : promptCache[dateStr]));
          setLoading(false);
        }
        return;
      }

      // De-dupe concurrent fetches for the same date
      if (!inflight[dateStr]) {
        inflight[dateStr] = supabase
          .from('daily_prompts')
          .select('*')
          .eq('prompt_date', dateStr)
          .eq('is_active', true)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) throw error;
            promptCache[dateStr] = data;
            return data;
          })
          .finally(() => {
            delete inflight[dateStr];
          });
      }

      try {
        const data = await inflight[dateStr];
        if (!cancelled) {
          setPrompt((prev: any) => (prev?.id === data?.id ? prev : data));
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Error fetching prompt');
          setPrompt(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchPrompt();
    return () => {
      cancelled = true;
    };
  }, [targetDate]);

  return { prompt, loading, error };
} 