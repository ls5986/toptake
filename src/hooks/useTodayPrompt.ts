import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';

export function useTodayPrompt() {
  const { user } = useAppContext();
  const [prompt, setPrompt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasPostedToday, setHasPostedToday] = useState(false);

  useEffect(() => {
    async function fetchPromptAndTake() {
      setLoading(true);
      setError(null);
      // Get local date string YYYY-MM-DD
      const today = new Date();
      const todayStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');
      try {
        // Fetch today's prompt
        const { data: promptData, error: promptError } = await supabase
          .from('daily_prompts')
          .select('*')
          .eq('prompt_date', todayStr)
          .eq('is_active', true)
          .single();
        if (promptError) throw promptError;
        setPrompt(promptData);
        // Check if user has posted today
        if (user?.id && promptData?.id) {
          const { data: takes, error: takeError } = await supabase
            .from('takes')
            .select('id')
            .eq('user_id', user.id)
            .eq('prompt_id', promptData.id)
            .limit(1);
          if (takeError) throw takeError;
          setHasPostedToday(!!(takes && takes.length > 0));
        } else {
          setHasPostedToday(false);
        }
      } catch (err) {
        setError(err.message || 'Error fetching today\'s prompt');
        setPrompt(null);
        setHasPostedToday(false);
      } finally {
        setLoading(false);
      }
    }
    fetchPromptAndTake();
  }, [user?.id]);

  return { prompt, loading, error, hasPostedToday };
} 