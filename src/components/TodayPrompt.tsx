import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Adjust this import if your supabase client is elsewhere

const TodayPrompt: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrompt = async () => {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('prompt_text')
        .eq('prompt_date', today)
        .single();

      if (data && data.prompt_text) {
        setPrompt(data.prompt_text);
      } else {
        setPrompt('No prompt for today!');
      }
      setLoading(false);
    };
    fetchPrompt();
  }, []);

  if (loading) return <div>Loading prompt...</div>;
  return (
    <div>
      <h2>🔥 Today's Prompt</h2>
      <div>{prompt}</div>
    </div>
  );
};

export default TodayPrompt; 