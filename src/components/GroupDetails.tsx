import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { fixPromptWithAI } from '@/lib/openai';

interface Props { threadId: string; onBack: () => void; }

const GroupDetails: React.FC<Props> = ({ threadId, onBack }) => {
  const { user } = useAppContext();
  const [members, setMembers] = useState<{ id: string; username: string }[]>([]);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csvText, setCsvText] = useState('');
  const [context, setContext] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data } = await supabase
          .from('chat_participants')
          .select('user_id, profiles:user_id(username)')
          .eq('thread_id', threadId);
        const rows = (data || []).map((r:any)=> ({ id: r.user_id, username: r.profiles?.username || 'user' }));
        if (!cancelled) setMembers(rows);
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [threadId]);

  const invite = async () => {
    if (!username.trim()) return;
    setError(null);
    try {
      const { error } = await supabase.rpc('add_group_member', { p_thread: threadId, p_username: username.trim() });
      if (error) throw error;
      const { data: p } = await supabase.from('profiles').select('id,username').ilike('username', username.trim()).limit(1).maybeSingle();
      if (p) setMembers(prev => [...prev, { id: p.id, username: p.username || username.trim() }]);
      setUsername('');
    } catch (e:any) { setError(e?.message || 'Failed to invite'); }
  };

  const remove = async (id: string) => {
    await supabase.rpc('remove_group_member', { p_thread: threadId, p_user: id });
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const uploadCsv = async () => {
    const rows = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const line of rows) {
      await supabase.rpc('add_group_prompt', { p_thread: threadId, p_prompt: line });
    }
    setCsvText('');
  };

  const generateAI = async () => {
    setAiBusy(true); setError(null);
    try {
      const improved = await fixPromptWithAI(context || 'Write one engaging, friendly prompt about staying in touch with friends.');
      await supabase.from('group_prompts').insert({ thread_id: threadId, prompt_text: improved, source: 'ai' });
      setContext('');
    } catch (e:any) { setError(e?.message || 'AI failed'); }
    finally { setAiBusy(false); }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-brand-border/70 bg-brand-surface/90">
        <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
        <div className="text-[11px] uppercase tracking-wide text-brand-muted">Group Details</div>
      </div>
      <div className="p-3 space-y-3">
        <Card className="bg-brand-surface/70 border-brand-border/70">
          <CardContent className="p-3">
            <div className="text-sm font-medium mb-2">Members</div>
            <div className="space-y-1">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span>@{m.username}</span>
                  <Button size="sm" variant="ghost" onClick={()=>remove(m.id)}>Remove</Button>
                </div>
              ))}
              {members.length === 0 && <div className="text-brand-muted text-sm">No members yet.</div>}
            </div>
            <div className="flex gap-2 mt-3">
              <input className="flex-1 p-2 rounded bg-brand-background border border-brand-border" placeholder="Invite by username" value={username} onChange={e=>setUsername(e.target.value)} />
              <Button onClick={invite}>Invite</Button>
            </div>
            {error && <div className="text-brand-danger text-sm mt-2">{error}</div>}
          </CardContent>
        </Card>

        <Card className="bg-brand-surface/70 border-brand-border/70">
          <CardContent className="p-3 space-y-2">
            <div className="text-sm font-medium">Upload CSV Prompts</div>
            <textarea className="w-full p-2 rounded bg-brand-background border border-brand-border" rows={4} placeholder="One prompt per line" value={csvText} onChange={e=>setCsvText(e.target.value)} />
            <Button onClick={uploadCsv} disabled={!csvText.trim()}>Save prompts</Button>
          </CardContent>
        </Card>

        <Card className="bg-brand-surface/70 border-brand-border/70">
          <CardContent className="p-3 space-y-2">
            <div className="text-sm font-medium">AI Prompt (single)</div>
            <textarea className="w-full p-2 rounded bg-brand-background border border-brand-border" rows={3} placeholder="Describe your group context (book, vibe, tone)…" value={context} onChange={e=>setContext(e.target.value)} />
            <Button onClick={generateAI} disabled={aiBusy}>{aiBusy ? 'Generating…' : 'Generate & save'}</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GroupDetails;


