import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

export interface DailyPrompt {
  id: string;
  prompt_text: string;
  prompt_date: string;
  is_active: boolean;
  created_at: string;
}

export const useDailyPrompt = (date?: Date) => {
  const [todaysPrompt, setTodaysPrompt] = useState<DailyPrompt | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrompt = async (targetDate: Date = new Date()) => {
    try {
      setLoading(true);
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      
      const { data, error: fetchError } = await supabase
        .from('daily_prompts')
        .select('*')
        .eq('prompt_date', dateStr)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No prompt found for this date
          setCurrentPrompt('No prompt available for this date');
          setTodaysPrompt(null);
        } else {
          throw fetchError;
        }
      } else {
        setCurrentPrompt(data.prompt_text);
        setTodaysPrompt(data);
      }
    } catch (err) {
      console.error('Error fetching prompt:', err);
      setError(err instanceof Error ? err.message : 'Failed to get prompt');
      setCurrentPrompt('Error loading prompt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompt(date);
  }, [date]);

  return {
    todaysPrompt,
    currentPrompt,
    loading,
    error,
    refetch: () => fetchPrompt(date)
  };
};