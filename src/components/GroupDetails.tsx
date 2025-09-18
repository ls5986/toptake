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
  const [searchResults, setSearchResults] = useState<{ id:string; username:string }[]>([]);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csvText, setCsvText] = useState('');
  const [context, setContext] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [prompts, setPrompts] = useState<{ id:string; prompt_text:string; prompt_date:string|null; created_at:string }[]>([]);

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
      // load prompts for this thread
      try {
        const { data: pr } = await supabase
          .from('group_prompts')
          .select('id,prompt_text,prompt_date,created_at')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: false });
        if (!cancelled) setPrompts((pr as any) || []);
      } catch {}
    }
    load();
    return () => { cancelled = true; };
  }, [threadId]);

  const invite = async () => {
    if (!username.trim()) return;
    setError(null); setInviteMsg(null);
    try {
      // Prefer result selected from search
      const selected = searchResults.find(r => r.username.toLowerCase() === username.trim().toLowerCase());
      const targetUsername = selected?.username || username.trim();
      setInvitingUserId(selected?.id || null);
      const { error } = await supabase.rpc('add_group_member', { p_thread: threadId, p_username: targetUsername });
      if (error) throw error;
      if (selected) {
        const exists = members.some(m => m.id === selected.id);
        if (!exists) setMembers(prev => [...prev, { id: selected.id, username: selected.username }]);
      } else {
        const { data: p } = await supabase.from('profiles').select('id,username').ilike('username', targetUsername).limit(1).maybeSingle();
        if (p) {
          const exists = members.some(m => m.id === p.id);
          if (!exists) setMembers(prev => [...prev, { id: p.id, username: p.username || targetUsername }]);
        }
      }
      setInviteMsg(`Invited @${targetUsername}`);
      setUsername('');
      setSearchResults([]);
    } catch (e:any) { setError(e?.message || 'Failed to invite'); }
    finally { setInvitingUserId(null); }
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
    const { data: pr } = await supabase
      .from('group_prompts')
      .select('id,prompt_text,prompt_date,created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false });
    setPrompts((pr as any) || []);
  };

  const generateAI = async () => {
    setAiBusy(true); setError(null);
    try {
      const improved = await fixPromptWithAI(context || 'Write one engaging, friendly prompt about staying in touch with friends.');
      // if no prompt for today, set this as today's prompt_date
      const today = new Date(); today.setHours(0,0,0,0);
      const todayStr = today.toISOString().slice(0,10);
      const { data: existing } = await supabase
        .from('group_prompts')
        .select('id')
        .eq('thread_id', threadId)
        .eq('prompt_date', todayStr)
        .limit(1);
      const payload: any = { thread_id: threadId, prompt_text: improved, source: 'ai' };
      if (!existing || (existing as any).length === 0) payload.prompt_date = todayStr;
      await supabase.from('group_prompts').insert(payload);
      setContext('');
      const { data: pr } = await supabase
        .from('group_prompts')
        .select('id,prompt_text,prompt_date,created_at')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: false });
      setPrompts((pr as any) || []);
    } catch (e:any) { setError(e?.message || 'AI failed'); }
    finally { setAiBusy(false); }
  };

  const setToday = async (id: string) => {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().slice(0,10);
    await supabase.from('group_prompts').update({ prompt_date: todayStr }).eq('id', id);
    const { data: pr } = await supabase
      .from('group_prompts')
      .select('id,prompt_text,prompt_date,created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false });
    setPrompts((pr as any) || []);
  };

  const leave = async () => {
    try {
      await supabase.rpc('leave_group', { p_thread: threadId });
      onBack();
    } catch (e:any) { setError(e?.message || 'Failed to leave'); }
  };

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-brand-border/70 bg-brand-surface/90">
        <Button variant="ghost" size="sm" onClick={onBack}>Back</Button>
        <div className="text-[11px] uppercase tracking-wide text-brand-muted">Group Details</div>
        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={leave}>Leave group</Button>
        </div>
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
            <div className="mt-3">
              <input
                className="w-full p-2 rounded bg-brand-background border border-brand-border"
                placeholder="Search or type @username"
                value={username}
                onChange={async (e)=>{
                  const q = e.target.value; setUsername(q); setInviteMsg(null);
                  if (q.trim().length < 2) { setSearchResults([]); return; }
                  try {
                    const { data } = await supabase
                      .from('profiles')
                      .select('id,username')
                      .ilike('username', `%${q.trim()}%`)
                      .limit(5);
                    setSearchResults((data as any) || []);
                  } catch { setSearchResults([]); }
                }}
              />
              {searchResults.length > 0 && (
                <div className="mt-1 border border-brand-border rounded bg-brand-surface">
                  {searchResults.map(r => (
                    <button key={r.id} className="w-full text-left px-2 py-1 hover:bg-brand-background" onClick={()=>{ setUsername(r.username); setSearchResults([]); }}>
                      @{r.username}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-2">
                <Button onClick={invite} disabled={!username.trim() || !!invitingUserId}>{invitingUserId ? 'Inviting…' : 'Invite'}</Button>
              </div>
              {inviteMsg && <div className="text-brand-success text-sm mt-1">{inviteMsg}</div>}
              {error && <div className="text-brand-danger text-sm mt-1">{error}</div>}
            </div>
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

        <Card className="bg-brand-surface/70 border-brand-border/70">
          <CardContent className="p-3">
            <div className="text-sm font-medium mb-2">Saved Prompts</div>
            <div className="space-y-2">
              {prompts.map(p => (
                <div key={p.id} className="border border-brand-border/70 rounded p-2">
                  <div className="text-sm text-brand-text">{p.prompt_text}</div>
                  <div className="text-[11px] text-brand-muted mt-1">{p.prompt_date ? `For ${p.prompt_date}` : 'No date set'}</div>
                  {!p.prompt_date && (
                    <div className="mt-1">
                      <Button size="sm" variant="outline" onClick={()=>setToday(p.id)}>Use for today</Button>
                    </div>
                  )}
                </div>
              ))}
              {prompts.length === 0 && <div className="text-brand-muted text-sm">No prompts yet.</div>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GroupDetails;


