import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';

export function useTodayPrompt() {
  const { user } = useAppContext();
  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPrompt() {
      console.log('🔍 useTodayPrompt: Fetching prompt...');
      setLoading(true);
      setError(null);
      // Get local date string YYYY-MM-DD
      const today = new Date();
      const todayStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');
      
      console.log('📅 useTodayPrompt: Looking for prompt on date:', todayStr);
      
      try {
        // Fetch today's prompt
        const { data: promptData, error: promptError } = await supabase
          .from('daily_prompts')
          .select('*')
          .eq('prompt_date', todayStr)
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
        setError(err.message || 'Error fetching today\'s prompt');
        setPrompt(null);
      } finally {
        setLoading(false);
      }
    }
    
    // Fetch prompt immediately when component mounts
    fetchPrompt();
  }, []); // Remove user?.id dependency to fetch immediately

  return { prompt, loading, error };
} 