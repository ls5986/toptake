import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function usePromptForDate(date: Date) {
  const [promptText, setPromptText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setPromptText('');
    setError(null);
    const fetchPrompt = async () => {
      const dateStr = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('prompt_text')
        .eq('prompt_date', dateStr)
        .single();
      if (!isMounted) return;
      if (error) {
        setPromptText('');
        setError(error.message);
      } else {
        setPromptText(data?.prompt_text || '');
        setError(null);
      }
      setLoading(false);
    };
    fetchPrompt();
    return () => { isMounted = false; };
  }, [date]);

  return { promptText, loading, error };
} 