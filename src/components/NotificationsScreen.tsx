import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, ThumbsUp, Star, User } from 'lucide-react';

interface Notification {
  id: string;
  type: 'comment' | 'reaction';
  actor: { id: string; username: string };
  takeid: string;
  created_at: string;
  read: boolean;
  extra?: any;
}

export const NotificationsScreen: React.FC<{ onGoToTake: (takeid: string) => void; onUpdateUnread: () => void }> = ({ onGoToTake, onUpdateUnread }) => {
  const { user } = useAppContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    // Example: fetch from a 'notifications' table
    const { data, error } = await supabase
      .from('notifications')
      .select('id, type, actor:actor_id(id, username), takeid, created_at, read, extra')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    setNotifications((prev) => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    await supabase.from('notifications').update({ read: true }).eq('id', notificationId);
    onUpdateUnread();
  };

  const handleClick = (notification: Notification) => {
    markAsRead(notification.id);
    onGoToTake(notification.takeid);
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b border-brand-border bg-brand-surface">
        <h2 className="text-xl font-semibold text-brand-text">Notifications</h2>
      </div>
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-brand-muted">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="flex items-center justify-center h-full text-brand-muted">No notifications yet.</div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${!n.read ? 'border-brand-accent bg-brand-accent/10' : 'border-brand-border bg-brand-surface'}`}
                  onClick={() => handleClick(n)}
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-muted/20">
                    {n.type === 'comment' ? <MessageSquare className="w-5 h-5 text-brand-accent" /> : <ThumbsUp className="w-5 h-5 text-brand-accent" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-brand-text truncate">
                      <span className="font-semibold">{n.actor?.username || 'Someone'}</span>
                      {n.type === 'comment' ? ' commented on your take' : ' reacted to your take'}
                    </div>
                    <div className="text-xs text-brand-muted mt-0.5">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                  {!n.read && <Badge className="bg-brand-danger text-xs px-2 py-0.5">New</Badge>}
                  <Button variant="ghost" size="sm" className="ml-2" onClick={e => { e.stopPropagation(); handleClick(n); }}>
                    View
                  </Button>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default NotificationsScreen; 