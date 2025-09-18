import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/contexts/AppContext';
import CreateGroupModal from './CreateGroupModal';

interface ThreadRow {
  id: string;
  is_group: boolean;
  name: string | null;
  privacy: string;
  frequency: string | null;
  created_at: string;
  lastSnippet?: string;
  unread?: number;
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
        const { data, error } = await supabase
          .from('chat_threads')
          .select('id, is_group, name, privacy, frequency, created_at')
          .in('id', supabase
            .from('chat_participants') as any);
        // Some environments don't support nested in(); fallback to manual join via RPC-like approach
      } catch {}
      try {
        // Fallback simple join: fetch participant thread_ids then fetch threads
        const { data: parts } = await supabase
          .from('chat_participants')
          .select('thread_id')
          .eq('user_id', user!.id);
        const ids = (parts || []).map((p: any) => p.thread_id);
        if (!ids.length) { if (!cancelled) setThreads([]); return; }
        const { data: th } = await supabase
          .from('chat_threads')
          .select('id, is_group, name, privacy, frequency, created_at')
          .in('id', ids)
          .order('created_at', { ascending: false });
        let list: ThreadRow[] = (th as any) || [];
        // augment with last message + unread count
        for (const t of list) {
          const { data: last } = await supabase
            .from('chat_messages')
            .select('content, created_at')
            .eq('thread_id', t.id)
            .order('created_at', { ascending: false })
            .limit(1);
          const { data: part } = await supabase
            .from('chat_participants')
            .select('last_read_at')
            .eq('thread_id', t.id)
            .eq('user_id', user!.id)
            .maybeSingle();
          let unread = 0;
          if (part) {
            const { count } = await supabase
              .from('chat_messages')
              .select('id', { count: 'exact', head: true })
              .eq('thread_id', t.id)
              .gt('created_at', (part as any).last_read_at || '1970-01-01');
            unread = (count as number) || 0;
          }
          t.lastSnippet = last?.[0]?.content || '';
          t.unread = unread;
        }
        if (!cancelled) setThreads(list);

        // discover public groups not joined
        const { data: pub } = await supabase
          .from('chat_threads')
          .select('id, is_group, name, privacy, frequency, created_at')
          .eq('privacy', 'public');
        const pubList = ((pub as any) || []).filter((t:any)=> !ids.includes(t.id));
        if (!cancelled) setDiscover(pubList);
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border/70 bg-brand-surface/90">
        <div className="flex items-center gap-2">
          <div className="text-[11px] uppercase tracking-wide text-brand-muted">Messages</div>
          <div className="text-xs text-brand-muted">
            <button className={`px-2 py-0.5 rounded ${!explore?'bg-brand-accent/20':''}`} onClick={()=>setExplore(false)}>Your threads</button>
            <button className={`ml-1 px-2 py-0.5 rounded ${explore?'bg-brand-accent/20':''}`} onClick={()=>setExplore(true)}>Explore</button>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={()=>setShowCreate(true)}>New</Button>
      </div>
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-brand-muted">Loading…</div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {!explore ? (
                <>
                  {threads.map(t => (
                    <Card key={t.id} className="bg-brand-surface/70 border-brand-border/70 hover:border-brand-accent cursor-pointer" onClick={()=>onOpenThread(t.id)}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-brand-text font-medium truncate">{t.name || 'Group'}</div>
                          {t.unread && t.unread > 0 && <span className="text-[10px] bg-brand-accent text-white rounded-full px-1.5 py-0.5">{t.unread}</span>}
                        </div>
                        {t.lastSnippet && <div className="text-xs text-brand-muted mt-0.5 truncate">{t.lastSnippet}</div>}
                      </CardContent>
                    </Card>
                  ))}
                  {threads.length === 0 && (
                    <div className="text-center text-brand-muted py-8">No messages yet.</div>
                  )}
                </>
              ) : (
                <>
                  {discover.map(t => (
                    <Card key={t.id} className="bg-brand-surface/70 border-brand-border/70">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <div className="text-brand-text font-medium">{t.name || 'Group'}</div>
                          <div className="text-xs text-brand-muted">Public group</div>
                        </div>
                        <Button size="sm" onClick={async()=>{ await supabase.rpc('join_group', { p_thread: t.id }); onOpenThread(t.id); }}>Join</Button>
                      </CardContent>
                    </Card>
                  ))}
                  {discover.length === 0 && <div className="text-center text-brand-muted py-8">No public groups found.</div>}
                </>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
      {showCreate && (
        <CreateGroupModal isOpen={showCreate} onClose={()=>setShowCreate(false)} onCreated={(id)=>{ setShowCreate(false); onOpenThread(id); }} />
      )}
    </div>
  );
};

export default MessagesInbox;


