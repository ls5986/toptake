import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Simple client event logger to Supabase
import { supabase } from '@/lib/supabase';
let eventLogsChecked = false;
let eventLogsAvailable = true;
export async function logClientEvent(eventType: string, payload?: Record<string, any>) {
  try {
    if (!eventLogsChecked) {
      eventLogsChecked = true;
      const probe: any = await supabase.from('event_logs').select('id', { head: true, count: 'exact' });
      if (probe?.error) eventLogsAvailable = false;
    }
    if (!eventLogsAvailable) return;
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
