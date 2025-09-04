import { supabase } from '@/lib/supabase';

export type NotificationType = 'comment' | 'reaction' | 'follow' | 'mention' | 'system' | 'prompt_submitted' | 'prompt_approved' | 'prompt_rejected';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title?: string;
  message?: string;
  actor_id?: string | null;
  takeid?: string | null;
  extra?: Record<string, any> | null;
  read: boolean;
  created_at: string;
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, user_id, type, title, message, actor_id, takeid, extra, read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as AppNotification[];
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count || 0;
}

export async function markRead(notificationId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true, read_at: new Date().toISOString() }).eq('id', notificationId);
}

export async function markAllRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('read', false);
}

export function subscribeNotifications(userId: string, onInsert: (n: AppNotification) => void) {
  const channel = supabase
    .channel(`notif:${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, payload => {
      onInsert(payload.new as AppNotification);
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
