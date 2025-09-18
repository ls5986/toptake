import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/contexts/AppContext';

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('chat_messages')
          .select('id, sender_id, content, created_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });
        if (!cancelled) setMessages((data as any) || []);
      } finally {
        if (!cancelled) setLoading(false);
        setTimeout(()=> endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    }
    load();
    return () => { cancelled = true; };
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

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-brand-border/70 bg-brand-surface/90">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
          <div className="text-[11px] uppercase tracking-wide text-brand-muted">Chat</div>
        </div>
        {onOpenDetails && (
          <Button variant="outline" size="sm" onClick={onOpenDetails}>Details</Button>
        )}
      </div>
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="h-full flex items-center justify-center text-brand-muted">Loading…</div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {messages.map(m => (
                <div key={m.id} className={`max-w-[80%] px-3 py-2 rounded border ${m.sender_id === user?.id ? 'ml-auto bg-brand-accent/20 border-brand-accent/60' : 'bg-brand-surface/70 border-brand-border/70'}`}>
                  <div className="text-sm text-brand-text whitespace-pre-wrap break-words">{m.content}</div>
                  <div className="text-[10px] text-brand-muted mt-1">{new Date(m.created_at).toLocaleTimeString()}</div>
                </div>
              ))}
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


