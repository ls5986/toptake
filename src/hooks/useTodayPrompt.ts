import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';

export function useTodayPrompt(targetDate?: Date) {
  const { user } = useAppContext();
  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPrompt() {
      console.log('🔍 useTodayPrompt: Fetching prompt...');
      setLoading(true);
      setError(null);
      
      // Use targetDate if provided, otherwise use today
      const dateToUse = targetDate || new Date();
      const dateStr = dateToUse.getFullYear() + '-' +
        String(dateToUse.getMonth() + 1).padStart(2, '0') + '-' +
        String(dateToUse.getDate()).padStart(2, '0');
      
      console.log('📅 useTodayPrompt: Looking for prompt on date:', dateStr);
      
      try {
        // Fetch prompt for the specified date
        const { data: promptData, error: promptError } = await supabase
          .from('daily_prompts')
          .select('*')
          .eq('prompt_date', dateStr)
          .eq('is_active', true)
          .single();
        
        if (promptError) {
          console.error('❌ useTodayPrompt: Error fetching prompt:', promptError);
          throw promptError;
        }
        
        console.log('✅ useTodayPrompt: Prompt fetched:', promptData);
        setPrompt(promptData);
      } catch (err) {
        console.error('❌ useTodayPrompt: Error:', err);
        setError(err.message || 'Error fetching prompt');
        setPrompt(null);
      } finally {
        setLoading(false);
      }
    }
    
    // Fetch prompt immediately when component mounts or targetDate changes
    fetchPrompt();
  }, [targetDate]); // Add targetDate as dependency

  return { prompt, loading, error };
} 