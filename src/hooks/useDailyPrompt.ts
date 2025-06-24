import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface DailyPrompt {
  id: string;
  prompt_text: string;
  prompt_date: string;
  category?: string;
  created_at: string;
}

export const useDailyPrompt = () => {
  const [prompt, setPrompt] = useState<DailyPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const today = new Date();
        const todayStr = today.getFullYear() + '-' +
          String(today.getMonth() + 1).padStart(2, '0') + '-' +
          String(today.getDate()).padStart(2, '0');
        const { data, error } = await supabase
          .from('daily_prompts')
          .select('*')
          .eq('prompt_date', todayStr)
          .eq('is_active', true)
          .single();

        if (error) {
          setError(error.message);
        } else {
          setPrompt(data);
        }
      } catch (err) {
        setError('Failed to fetch prompt');
      } finally {
        setLoading(false);
      }
    };

    fetchPrompt();
  }, []);

  return { prompt, loading, error };
}; 