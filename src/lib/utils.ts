import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple client event logger to Supabase
import { supabase } from '@/lib/supabase';
export async function logClientEvent(eventType: string, payload?: Record<string, any>) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('event_logs').insert({
      user_id: user?.id || null,
      event_type: eventType,
      payload: payload || {}
    });
  } catch (e) {
    // no-op in client
  }
}
