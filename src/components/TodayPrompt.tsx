import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Adjust this import if your supabase client is elsewhere
import { useTodayPrompt } from '@/hooks/useTodayPrompt';

const TodayPrompt: React.FC = () => {
  const { prompt, loading, error } = useTodayPrompt();

  if (loading) return <div>Loading prompt...</div>;
  if (error) return <div>{error}</div>;
  if (!prompt) return <div>No prompt for today!</div>;
  return (
    <div>
      <h2>🔥 Today's Prompt</h2>
      <div>{prompt.prompt_text}</div>
    </div>
  );
};

export default TodayPrompt; 