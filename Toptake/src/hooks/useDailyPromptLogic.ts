import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface DailyPrompt {
  id: string;
  prompt: string;
  category: string;
  date: string;
  created_at: string;
}

const fallbackPrompts = [
  'If you could erase one thing from the internet forever, what would it be and why?',
  'Should AI replace human teachers in schools?',
  'Is remote work killing company culture?',
  'Should social media have age restrictions?',
  'Is cancel culture going too far or not far enough?'
];

export const useDailyPromptLogic = () => {
  const [currentPrompt, setCurrentPrompt] = useState<DailyPrompt | null>(null);
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [loading, setLoading] = useState(true);

  const submitTake = async (content: string, isAnonymous: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !currentPrompt) return false;

      const { error } = await supabase
        .from('takes')
        .insert({
          user_id: user.id,
          prompt_id: currentPrompt.id,
          content,
          is_anonymous: isAnonymous,
          prompt_date: new Date().toISOString().split('T')[0],
          take_date: new Date().toISOString().split('T')[0]
        });

      if (error) {
        console.error('Error submitting take:', error);
        return false;
      }

      setHasPostedToday(true);
      return true;
    } catch (error) {
      console.error('Error submitting take:', error);
      return false;
    }
  };

  useEffect(() => {
    const loadPromptData = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const dayIndex = today.getDate() % fallbackPrompts.length;
        
        // Use fallback prompt to avoid database issues
        const prompt = {
          id: `fallback-${todayStr}`,
          prompt: fallbackPrompts[dayIndex],
          category: 'general',
          date: todayStr,
          created_at: new Date().toISOString()
        };
        
        setCurrentPrompt(prompt);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('takes')
            .select('id')
            .eq('user_id', user.id)
            .eq('prompt_date', todayStr)
            .limit(1);
          
          setHasPostedToday(!!(data && data.length > 0));
        }
      } catch (error) {
        console.error('Error loading prompt data:', error);
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const dayIndex = today.getDate() % fallbackPrompts.length;
        setCurrentPrompt({
          id: `fallback-${todayStr}`,
          prompt: fallbackPrompts[dayIndex],
          category: 'general',
          date: todayStr,
          created_at: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };

    loadPromptData();
  }, []);

  return {
    currentPrompt,
    hasPostedToday,
    loading,
    submitTake
  };
};