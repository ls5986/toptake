import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/contexts/AppContext';
import CreateGroupModal from './CreateGroupModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ThreadRow {
  id: string;
  is_group: boolean;
  name: string | null;
  privacy: string;
  frequency: string | null;
  created_at: string;
  lastSnippet?: string;
  unread?: number;
  participants?: Array<{ id: string; username: string; avatar_url?: string }>;
  lastSenderUsername?: string;
}

interface MessagesInboxProps {
  onOpenThread: (threadId: string) => void;
}

const MessagesInbox: React.FC<MessagesInboxProps> = ({ onOpenThread }) => {
  const { user } = useAppContext();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [explore, setExplore] = useState(false);
  const [discover, setDiscover] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (!user?.id) { setThreads([]); return; }
        // Efficient inbox via RPC
        const { data: th, error: rpcErr } = await supabase.rpc('list_threads_for_user', { p_user: user.id });
        if (rpcErr) throw rpcErr;
        let list: ThreadRow[] = ((th as any) || []).map((t:any)=>({
          id: t.id,
          is_group: t.is_group,
          name: t.name,
          privacy: t.privacy,
          frequency: t.frequency,
          created_at: t.created_at,
          lastSnippet: t.last_snippet,
          unread: t.unread
        }));

        // Fetch participants for avatars/usernames
        const ids = list.map(t=>t.id);
        if (ids.length) {
          const { data: partsAll } = await supabase
            .from('chat_participants')
            .select('thread_id, user_id, profiles:user_id(id,username,avatar_url)')
            .in('thread_id', ids);
          const map: Record<string, Array<{ id:string; username:string; avatar_url?:string }>> = {};
          (partsAll || []).forEach((r:any) => {
            const arr = map[r.thread_id] || (map[r.thread_id] = []);
            if (r.profiles) arr.push({ id: r.profiles.id, username: r.profiles.username, avatar_url: r.profiles.avatar_url });
          });
          list.forEach(t => { t.participants = map[t.id] || []; });
        }

        if (!cancelled) setThreads(list);

        // discover public groups (always show; mark joined via Open button)
        const { data: pub } = await supabase
          .from('chat_threads')
          .select('id, is_group, name, privacy, frequency, created_at')
          .eq('privacy', 'public');
        if (!cancelled) setDiscover(((pub as any) || []));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Live updates via polling for simplicity (RLS prevents channels without Edge functions)
  useEffect(() => {
    if (!user?.id) return;
    const t = setInterval(async () => {
      try {
        const { data: parts } = await supabase
          .from('chat_participants')
          .select('thread_id')
          .eq('user_id', user!.id);
        const ids = (parts || []).map((p: any) => p.thread_id);
        if (!ids.length) return;
        const { data: th } = await supabase
          .from('chat_threads')
          .select('id, is_group, name, privacy, frequency, created_at')
          .in('id', ids)
          .order('created_at', { ascending: false });
        setThreads((th as any) || []);
      } catch {}
    }, 5000);
    return () => clearInterval(t);
  }, [user?.id]);

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Fixed Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-brand-border/70 bg-brand-surface">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-brand-text">Messages</div>
          <div className="flex items-center gap-1 bg-brand-background rounded-lg p-1">
            <button 
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${!explore ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text'}`} 
              onClick={()=>setExplore(false)}
            >
              Your threads
            </button>
            <button 
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${explore ? 'bg-brand-accent text-white' : 'text-brand-muted hover:text-brand-text'}`} 
              onClick={()=>setExplore(true)}
            >
              Explore
            </button>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={()=>setShowCreate(true)} className="bg-brand-accent/10 border-brand-accent/30 text-brand-accent hover:bg-brand-accent hover:text-white">
          New
        </Button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center text-brand-muted">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto mb-2"></div>
              <div>Loading messages...</div>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {!explore ? (
                <>
                  {threads.map(t => (
                    <Card key={t.id} className="bg-brand-surface/70 border-brand-border/70 hover:border-brand-accent/50 hover:bg-brand-surface cursor-pointer transition-all duration-200" onClick={()=>onOpenThread(t.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {(t.participants || []).filter(p=>p.id!==user?.id).slice(0,3).map(p => (
                              <Avatar key={p.id} className="h-8 w-8 ring-2 ring-brand-surface">
                                <AvatarImage src={p.avatar_url || ''} alt={p.username} />
                                <AvatarFallback className="text-xs bg-brand-accent/20 text-brand-text">{p.username?.slice(0,2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between min-w-0 mb-1">
                              <div className="text-brand-text font-medium truncate">{t.name || ((t.participants||[]).filter(p=>p.id!==user?.id).map(p=>p.username).join(', ') || 'Group')}</div>
                              {t.unread && t.unread > 0 && (
                                <span className="text-xs bg-brand-accent text-white rounded-full px-2 py-1 min-w-[20px] text-center">
                                  {t.unread}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-brand-muted truncate">
                              {t.lastSenderUsername ? `${t.lastSenderUsername}: ` : ''}{t.lastSnippet || 'No messages yet'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {threads.length === 0 && (
                    <div className="text-center text-brand-muted py-12">
                      <div className="text-4xl mb-4">💬</div>
                      <div className="text-lg font-medium mb-2">No messages yet</div>
                      <div className="text-sm">Start a conversation or join a group!</div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {discover.map(t => (
                    <Card key={t.id} className="bg-brand-surface/70 border-brand-border/70 hover:border-brand-accent/50 transition-all duration-200">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-brand-text font-medium mb-1">{t.name || 'Group'}</div>
                          <div className="text-sm text-brand-muted">Public group • {t.frequency || 'No schedule'}</div>
                        </div>
                        {threads.find(x => x.id === t.id)
                          ? <Button size="sm" variant="outline" onClick={()=> onOpenThread(t.id)} className="bg-brand-accent/10 border-brand-accent/30 text-brand-accent hover:bg-brand-accent hover:text-white">Open</Button>
                          : <Button size="sm" onClick={async()=>{ await supabase.rpc('join_group', { p_thread: t.id }); onOpenThread(t.id); }} className="bg-brand-accent hover:bg-brand-primary text-white">Join</Button>
                        }
                      </CardContent>
                    </Card>
                  ))}
                  {discover.length === 0 && (
                    <div className="text-center text-brand-muted py-12">
                      <div className="text-4xl mb-4">🔍</div>
                      <div className="text-lg font-medium mb-2">No public groups found</div>
                      <div className="text-sm">Be the first to create a public group!</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreate && (
        <CreateGroupModal isOpen={showCreate} onClose={()=>setShowCreate(false)} onCreated={(id)=>{ setShowCreate(false); onOpenThread(id); }} />
      )}
    </div>
  );
};

export default MessagesInbox;


