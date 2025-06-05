import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useDailyPrompt } from './useDailyPrompt';

export const useNewDailyPrompt = () => {
  const { todaysPrompt, loading: promptLoading } = useDailyPrompt();
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  const getCurrentPrompt = () => {
    if (todaysPrompt) {
      return {
        id: todaysPrompt.id,
        prompt: todaysPrompt.prompt_text,
        category: todaysPrompt.category || 'general',
        date: new Date().toISOString().split('T')[0],
        created_at: todaysPrompt.created_at
      };
    }
    
    return {
      id: 'loading',
      prompt: 'Loading prompt...',
      category: 'general',
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
  };

  const submitTake = async (content: string, isAnonymous: boolean = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      const prompt = getCurrentPrompt();
      const today = prompt.date;
      const promptId = prompt.id;
      const { error } = await supabase
        .from('takes')
        .insert({
          user_id: user.id,
          prompt_id: promptId,
          content,
          is_anonymous: isAnonymous,
          prompt_date: today,
          take_date: today
        });
      if (error) return false;
      // Insert engagement analytics record
      const { error: analyticsError } = await supabase
        .from('engagement_analytics')
        .insert({
          prompt_id: promptId,
          user_id: user.id,
          action_type: 'take',
          created_at: new Date().toISOString()
        });
      if (analyticsError) {
        console.error('Error inserting engagement analytics:', analyticsError);
      }
      setHasPostedToday(true);
      return true;
    } catch (error) {
      return false;
    }
  };

  useEffect(() => {
    const checkPosted = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('takes')
          .select('id')
          .eq('user_id', user.id)
          .eq('prompt_date', today)
          .limit(1);

        setHasPostedToday(!!(data && data.length > 0));
      } finally {
        setLoading(false);
      }
    };

    if (!promptLoading) checkPosted();
  }, [promptLoading]);

  return {
    currentPrompt: getCurrentPrompt(),
    hasPostedToday,
    loading: loading || promptLoading,
    error: null,
    submitTake
  };
};