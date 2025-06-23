import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface DailyPrompt {
  id: string;
  prompt_text: string;
  prompt_date: string;
  category?: string;
  created_at: string;
}

export function useDailyPrompt() {
  const [todaysPrompt, setTodaysPrompt] = useState<DailyPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    
    const fetchTodaysPrompt = async () => {
      try {
        const today = new Date().toLocaleDateString('en-CA');
        const { data, error } = await supabase
          .from('daily_prompts')
          .select('*')
          .eq('prompt_date', today)
          .single();

        if (!isMounted) return;
        
        if (error) {
          setError(error.message);
          setTodaysPrompt(null);
        } else {
          setTodaysPrompt(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch today\'s prompt');
          setTodaysPrompt(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTodaysPrompt();
    return () => { isMounted = false; };
  }, []);

  return { 
    todaysPrompt, 
    loading, 
    error,
    prompt: todaysPrompt?.prompt_text || 'Loading prompt...'
  };
} 