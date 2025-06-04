import { supabase } from '@/lib/supabase';

// Global prompt that should be the same for everyone every day
const GLOBAL_DAILY_PROMPT = "What's one controversial opinion you hold that most people would disagree with?";

export async function getTodayPrompt() {
  console.log('Using global daily prompt:', GLOBAL_DAILY_PROMPT);
  
  // Always return the same prompt - this is the core requirement
  return { prompt: GLOBAL_DAILY_PROMPT };
}

// Legacy function for backward compatibility
export async function getTodayPromptFromDB() {
  const today = new Date();
  const localDate = today.toISOString().split('T')[0]; // "YYYY-MM-DD"

  console.log('Fetching prompt for date:', localDate);

  // First try promptschedule table
  const { data: scheduleData, error: scheduleError } = await supabase
    .from('promptschedule')
    .select('prompt')
    .eq('date', localDate)
    .single();

  console.log('promptschedule query result:', { data: scheduleData, error: scheduleError });

  if (scheduleData && scheduleData.prompt) {
    console.log('Found existing prompt in promptschedule:', scheduleData.prompt);
    return { prompt: scheduleData.prompt };
  }

  // If no prompt found for today, try to get the most recent one
  const { data: recentData, error: recentError } = await supabase
    .from('promptschedule')
    .select('prompt')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  console.log('Recent prompt query result:', { data: recentData, error: recentError });

  if (recentData && recentData.prompt) {
    console.log('Using most recent prompt:', recentData.prompt);
    return { prompt: recentData.prompt };
  }

  // Fallback to global prompt
  console.log('Using global prompt as fallback');
  return { prompt: GLOBAL_DAILY_PROMPT };
}