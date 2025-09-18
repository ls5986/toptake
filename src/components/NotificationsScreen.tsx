import React, { useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, ThumbsUp } from 'lucide-react';
import { fetchNotifications, markRead, markAllRead, subscribeNotifications, type AppNotification } from '@/lib/notifications';

export const NotificationsScreen: React.FC = () => {
  const { user, setCurrentScreen, setCurrentTakeId } = useAppContext();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | null = null;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchNotifications(user.id);
        setNotifications(data);
      } finally {
        setLoading(false);
      }
    };

    load();
    unsubscribe = subscribeNotifications(user.id, (n) => {
      setNotifications(prev => [n, ...prev]);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

  const handleMarkAsRead = async (notificationId: string) => {
    setNotifications((prev) => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    try { await markRead(notificationId); } catch {}
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await markAllRead(user.id); } catch {}
  };

  const handleClick = (notification: AppNotification) => {
    handleMarkAsRead(notification.id);
    if (notification.takeid) {
      setCurrentTakeId(notification.takeid);
      setCurrentScreen('take');
    }
  };

  const getReactionEmoji = (reaction?: string) => {
    switch (reaction) {
      case 'wildTake': return '🚨';
      case 'fairPoint': return '⚖️';
      case 'mid': return '🙄';
      case 'thatYou': return '👻';
      default: return '👍';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-shrink-0 px-3 py-2 border-b border-brand-border/70 bg-brand-surface/90 backdrop-blur-sm flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-brand-muted">Alerts</div>
        {notifications.some(n => !n.read) && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>Mark all as read</Button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-brand-muted">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="flex items-center justify-center h-full text-brand-muted">No notifications yet.</div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {notifications.map((n) => (
                <Card
                  key={n.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-all ${!n.read ? 'border-brand-accent/80 bg-brand-accent/10' : 'border-brand-border/70 bg-brand-surface/70'}`}
                  onClick={() => handleClick(n)}
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-muted/20">
                    {n.type === 'comment' ? <MessageSquare className="w-5 h-5 text-brand-accent" /> : <ThumbsUp className="w-5 h-5 text-brand-accent" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-brand-text truncate">
                      <span className="font-semibold">{n.title || 'Notification'}</span>
                      {n.type === 'comment' ? (
                        <>
                          {' commented: '}
                          <span className="italic text-brand-muted">{(n.extra as any)?.comment?.slice(0, 60) || 'on your take'}</span>
                        </>
                      ) : n.type === 'reaction' ? (
                        <>
                          {' reacted '}
                          <span className="mx-1">{getReactionEmoji((n.extra as any)?.reaction)}</span>
                          <span className="text-brand-muted">{(n.extra as any)?.reaction || ''}</span>
                          {' to your take'}
                        </>
                      ) : n.message ? (
                        <>
                          {' — '}
                          <span className="text-brand-muted">{n.message}</span>
                        </>
                      ) : null}
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