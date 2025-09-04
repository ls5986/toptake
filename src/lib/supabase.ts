import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'X-Client-Info': 'toptake-app'
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Expose supabase on window for debugging
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

export const clearInvalidTokens = async () => {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.includes('supabase')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing tokens:', error);
  }
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const handleAuthError = (error: any): string => {
  if (!error) return 'An unknown error occurred';
  
  console.error('Auth error details:', error);
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code || '';
  
  if (code === '23505' || message.includes('duplicate key')) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  
  if (message.includes('user_not_found') || message.includes('invalid login credentials')) {
    return 'Invalid email or password';
  }
  if (message.includes('email not confirmed')) {
    return 'Please verify your email first';
  }
  if (message.includes('user already registered')) {
    return 'An account with this email already exists. Try logging in instead.';
  }
  if (message.includes('invalid email')) {
    return 'Please enter a valid email address';
  }
  if (message.includes('password')) {
    return 'Password must be at least 6 characters';
  }
  if (message.includes('rate limit')) {
    return 'Too many attempts. Please wait and try again';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
};

export const getTodayPrompt = async () => {
  const today = new Date();
  const todayStr = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
  const { data, error } = await supabase
    .from('daily_prompts')
    .select('*')
    .eq('prompt_date', todayStr)
    .single();
  if (error) {
    console.error('Prompt fetch error:', error);
    if (error.code === '406') {
      return { data: null, error: 'No prompt available for today.' };
    }
    return { data: null, error };
  }
  if (!data) {
    return { data: null, error: 'No prompt available for today.' };
  }
  return { data, error: null };
};

export async function addNotification(userId: string, type: string, message: string) {
  return supabase.from('notifications').insert({ user_id: userId, type, message });
}

// Add a test function to debug Supabase client
export const testSupabaseConnection = async () => {
  console.log('Testing Supabase connection...');
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('Supabase query timed out after 10 seconds');
      controller.abort();
    }, 10000);

    const { data, error } = await supabase
      .from('daily_prompts')
      .select('id')
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);
    console.log('Supabase test result:', { data, error });
    return { data, error };
  } catch (err) {
    console.error('Supabase test error:', err);
    return { data: null, error: err };
  }
};

export const getTodayTakes = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('takes')
    .select('*')
    .eq('user_id', userId)
    .eq('prompt_date', today);
  
  if (error) {
    console.error('Error fetching today\'s takes:', error);
    return [];
  }
  
  return data || [];
};