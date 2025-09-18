import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/contexts/AppContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
  id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
}

interface Props {
  threadId: string;
  onBack: () => void;
  onOpenDetails?: () => void;
}

const ChatThread: React.FC<Props> = ({ threadId, onBack, onOpenDetails }) => {
  const { user } = useAppContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [participants, setParticipants] = useState<Array<{ id: string; username: string; avatar_url?: string }>>([]);
  const [threadName, setThreadName] = useState<string | null>(null);
  const [todayPrompt, setTodayPrompt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // Load thread meta
        const { data: thread } = await supabase
          .from('chat_threads')
          .select('id, name, is_group')
          .eq('id', threadId)
          .maybeSingle();
        setThreadName((thread as any)?.name || null);

        // Load participants and hydrate with profile info
        const { data: parts } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('thread_id', threadId);
        const ids = ((parts as any) || []).map((p: any) => p.user_id);
        if (ids.length) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', ids);
          setParticipants(((profiles as any) || []).map((p: any) => ({ id: p.id, username: p.username, avatar_url: p.avatar_url })));
        } else {
          setParticipants([]);
        }

        const { data } = await supabase
          .from('chat_messages')
          .select('id, sender_id, content, created_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });
        const rows = (data as any) || [];
        if (!cancelled) setMessages(rows);

        // Ensure we have usernames/avatars for ALL senders (covers cases where participants fetch is stale)
        try {
          const haveIds = new Set<string>((participants || []).map(p => p.id));
          const senderIds = Array.from(new Set(rows.map((m: any) => m.sender_id))).filter((id: string)=> !!id);
          const missing = senderIds.filter(id => !haveIds.has(id));
          if (missing.length) {
            const { data: profs } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', missing);
            const extra = ((profs as any) || []).map((p:any)=> ({ id: p.id, username: p.username, avatar_url: p.avatar_url }));
            setParticipants(prev => {
              const map = new Map<string, any>();
              [...(prev||[]), ...extra].forEach(p => map.set(p.id, p));
              return Array.from(map.values());
            });
          }
        } catch {}

        // Load today's prompt for group threads
        try {
          const today = new Date();
          today.setHours(0,0,0,0);
          const todayStr = today.toISOString().slice(0,10);
          const { data: gp } = await supabase
            .from('group_prompts')
            .select('prompt_text')
            .eq('thread_id', threadId)
            .eq('prompt_date', todayStr)
            .maybeSingle();
          if (!cancelled) setTodayPrompt((gp as any)?.prompt_text || null);
        } catch { if (!cancelled) setTodayPrompt(null); }
      } finally {
        if (!cancelled) setLoading(false);
        setTimeout(()=> endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [threadId]);

  // Realtime: append new messages for this thread
  useEffect(() => {
    const channel = supabase.channel(`chat:${threadId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `thread_id=eq.${threadId}`
      }, (payload: any) => {
        const row = payload.new as any;
        setMessages(prev => [...prev, { id: row.id, sender_id: row.sender_id, content: row.content, created_at: row.created_at }]);
        setTimeout(()=> endRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);
        // Mark as read on incoming messages when viewing the thread
        try {
          if (row.sender_id !== user?.id) {
            supabase.rpc('mark_thread_read', { p_thread: threadId }).then(()=>{}).catch(()=>{});
          }
        } catch {}
      })
      .subscribe();

    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, [threadId]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    try {
      await supabase.rpc('send_message', { p_thread: threadId, p_content: text });
      const msg: Message = { id: Math.random().toString(36).slice(2), sender_id: user!.id, content: text, created_at: new Date().toISOString() };
      setMessages(prev => [...prev, msg]);
      setTimeout(()=> endRef.current?.scrollIntoView({ behavior: 'smooth' }), 10);
    } catch (e) {
      // no-op
    }
  };

  // mark read when opening
  useEffect(() => {
    (async ()=>{
      try {
        await supabase
          .from('chat_participants')
          .update({ last_read_at: new Date().toISOString() })
          .eq('thread_id', threadId)
          .eq('user_id', user!.id);
      } catch {}
    })();
  }, [threadId, user?.id]);

  const otherParticipants = useMemo(() => participants.filter(p => p.id !== user?.id), [participants, user?.id]);
  const senderMap = useMemo(() => {
    const m: Record<string, { username: string; avatar_url?: string }> = {};
    for (const p of participants) m[p.id] = { username: p.username, avatar_url: p.avatar_url };
    return m;
  }, [participants]);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border/70 bg-brand-surface/90">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex -space-x-2">
              {otherParticipants.slice(0, 3).map(p => (
                <Avatar key={p.id} className="h-6 w-6 ring-2 ring-brand-surface">
                  <AvatarImage src={p.avatar_url || ''} alt={p.username} />
                  <AvatarFallback className="text-[10px] bg-brand-accent/20 text-brand-text">{p.username?.slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="truncate">
              <div className="text-sm font-medium text-brand-text truncate">
                {threadName || (otherParticipants.map(p => p.username).join(', ') || 'Chat')}
              </div>
              {participants.length > 0 && (
                <div className="text-[11px] text-brand-muted truncate">{participants.length} member{participants.length === 1 ? '' : 's'}</div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {todayPrompt && (
            <div className="hidden sm:flex items-center px-2 py-1 rounded-full text-[11px] border border-brand-border/70 text-brand-muted max-w-[40vw] truncate" title={todayPrompt}>
              <span className="mr-1 text-brand-accent">📄</span>
              <span className="truncate">{todayPrompt}</span>
            </div>
          )}
          {onOpenDetails && (
            <Button variant="outline" size="sm" onClick={onOpenDetails}>Details</Button>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-brand-muted">Loading…</div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {messages.map(m => {
                const isSelf = m.sender_id === user?.id;
                const sender = senderMap[m.sender_id];
                return (
                  <div key={m.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                    {!isSelf && (
                      <div className="mr-2 mt-0.5">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={sender?.avatar_url || ''} alt={sender?.username || ''} />
                          <AvatarFallback className="text-[10px] bg-brand-accent/20">{(sender?.username || '?').slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                    <div className={`max-w-[78%] ${isSelf ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`text-[11px] mb-0.5 ${isSelf ? 'text-brand-muted/70' : 'text-brand-muted'}`}>
                        {isSelf ? 'You' : (sender?.username || 'Unknown')}
                      </div>
                      <div className={`px-3 py-2 rounded border ${isSelf ? 'bg-brand-accent/20 border-brand-accent/60' : 'bg-brand-surface/70 border-brand-border/70'}`}>
                        <div className="text-sm text-brand-text whitespace-pre-wrap break-words">{m.content}</div>
                        <div className="text-[10px] text-brand-muted mt-1">{new Date(m.created_at).toLocaleTimeString()}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={endRef} />
            </div>
          </ScrollArea>
        )}
      </div>
      <div className="border-t border-brand-border/70 p-2 flex gap-2 bg-brand-surface">
        <input className="flex-1 p-2 rounded bg-brand-background border border-brand-border" value={input} onChange={e=>setInput(e.target.value)} placeholder="Message" onKeyDown={(e)=>{ if (e.key==='Enter') send(); }} />
        <Button onClick={send}>Send</Button>
      </div>
    </div>
  );
};

export default ChatThread;


