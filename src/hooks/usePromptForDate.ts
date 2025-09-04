import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Simple in-memory cache for prompts by date string
const promptCache: Record<string, string> = {};

export function clearPromptCache(dateStr?: string) {
  if (dateStr) {
    delete promptCache[dateStr];
  } else {
    Object.keys(promptCache).forEach(key => delete promptCache[key]);
  }
}

export function usePromptForDate(date: Date) {
  const [promptText, setPromptText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    const dateStr = date.toISOString().split('T')[0];

    // If cached, use it immediately
    if (promptCache[dateStr]) {
      setPromptText(promptCache[dateStr]);
      setLoading(false);
      return;
    }

    setPromptText('');
    const fetchPrompt = async () => {
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('*')
        .eq('prompt_date', dateStr)
        .maybeSingle();
      if (!isMounted) return;
      if (error) {
        setPromptText('');
        setError(error.message);
      } else {
        const text = data?.prompt_text || '';
        promptCache[dateStr] = text;
        setPromptText(text);
        setError(null);
      }
      setLoading(false);
    };
    fetchPrompt();
    return () => { isMounted = false; };
  }, [date]);

  return { promptText, loading, error };
} 