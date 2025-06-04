import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface ScheduledPrompt {
  id: string;
  prompt_text: string;
  scheduled_for: string;
  is_active: boolean;
  source?: string;
}

const fallbackPrompts = [
  'If you could erase one thing from the internet forever, what would it be and why?',
  'Should AI replace human teachers in schools?',
  'Is remote work killing company culture?'
];

export const useUserPromptSchedule = () => {
  const [todaysPrompt, setTodaysPrompt] = useState<ScheduledPrompt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodaysPrompt = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('*')
        .or(`scheduled_for.eq.${today},date.eq.${today},prompt_date.eq.${today}`)
        .eq('is_active', true)
        .single();
      
      if (data) {
        setTodaysPrompt({
          id: data.id,
          prompt_text: data.prompt_text || data.prompt,
          scheduled_for: data.scheduled_for || data.date || data.prompt_date,
          is_active: data.is_active,
          source: data.source
        });
      } else {
        const dayIndex = new Date().getDate() % fallbackPrompts.length;
        const mockPrompt = {
          id: `fallback-${today}`,
          prompt_text: fallbackPrompts[dayIndex],
          scheduled_for: today,
          is_active: true,
          source: 'fallback'
        };
        setTodaysPrompt(mockPrompt);
      }
    } catch (err) {
      console.error('Error fetching prompt:', err);
      const today = new Date().toISOString().split('T')[0];
      const dayIndex = new Date().getDate() % fallbackPrompts.length;
      const mockPrompt = {
        id: `fallback-${today}`,
        prompt_text: fallbackPrompts[dayIndex],
        scheduled_for: today,
        is_active: true,
        source: 'fallback'
      };
      setTodaysPrompt(mockPrompt);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const ensureSchedule = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existing } = await supabase
        .from('daily_prompts')
        .select('id')
        .or(`scheduled_for.eq.${today},date.eq.${today},prompt_date.eq.${today}`)
        .single();
      
      if (!existing) {
        const dayIndex = new Date().getDate() % fallbackPrompts.length;
        const promptText = fallbackPrompts[dayIndex];
        
        // Simplified insert with only essential fields
        const { data, error } = await supabase
          .from('daily_prompts')
          .insert({
            prompt_text: promptText,
            scheduled_for: today,
            is_active: true,
            source: 'auto_generated'
          })
          .select();
        
        if (error) {
          console.error('Error creating daily prompt:', error);
          throw error;
        }
        
        console.log('Successfully created daily prompt:', data);
      }
    } catch (error) {
      console.error('Error ensuring schedule:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchTodaysPrompt();
  }, []);

  return {
    todaysPrompt,
    loading,
    error,
    refetch: fetchTodaysPrompt,
    ensureSchedule
  };
};