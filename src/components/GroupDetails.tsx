import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { fixPromptWithAI } from '@/lib/openai';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Props { threadId: string; onBack: () => void; }

const GroupDetails: React.FC<Props> = ({ threadId, onBack }) => {
  const { user } = useAppContext();
  const [members, setMembers] = useState<{ id: string; username: string; avatar_url?: string; role?: string }[]>([]);
  const [username, setUsername] = useState('');
  const [searchResults, setSearchResults] = useState<{ id:string; username:string }[]>([]);
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<string[]>([]);
  // Invites where current user is the invitee
  const [receivedInvites, setReceivedInvites] = useState<Array<{ id:string; username:string }>>([]);
  // Invites the moderator sent (pending)
  const [sentInvites, setSentInvites] = useState<Array<{ id:string; username:string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csvText, setCsvText] = useState('');
  const [context, setContext] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [prompts, setPrompts] = useState<{ id:string; prompt_text:string; prompt_date:string|null; created_at:string }[]>([]);
  const [threadMeta, setThreadMeta] = useState<{ name?: string|null; privacy?: string; frequency?: string|null; timezone?: string|null; use_round_robin?: boolean }|null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const todayStr = useMemo(()=>{ const d=new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }, []);
  const upcoming = useMemo(()=> (prompts||[]).find(p=>p.prompt_date === todayStr) || null, [prompts, todayStr]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // Thread meta
        const { data: t } = await supabase
          .from('chat_threads')
          .select('id, name, privacy, frequency')
          .eq('id', threadId)
          .maybeSingle();
        setThreadMeta((t as any) || {});
        
        const { data } = await supabase
          .from('chat_participants')
          .select('user_id, role, profiles:user_id(username,avatar_url)')
          .eq('thread_id', threadId);
        const rows = (data || []).map((r:any)=> ({ id: r.user_id, username: r.profiles?.username || 'user', avatar_url: r.profiles?.avatar_url || '', role: r.role || undefined }));
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

      await reloadInvites();
    }
    load();
    return () => { cancelled = true; };
  }, [threadId]);

  const reloadInvites = async () => {
    try {
      // received by me
      const { data: inv } = await supabase
        .from('group_invites')
        .select('id, invited_user_id')
        .eq('thread_id', threadId)
        .eq('invited_user_id', user?.id || '')
        .eq('status', 'pending');
      const rec = (inv as any) || [];
      const recIds = rec.map((r:any)=> r.invited_user_id);
      let recProfiles: any[] = [];
      if (recIds.length) {
        const { data: profs } = await supabase.from('profiles').select('id, username').in('id', recIds);
        recProfiles = (profs as any) || [];
      }
      setReceivedInvites(rec.map((r:any)=> ({ id: r.id, username: (recProfiles.find(p=>p.id===r.invited_user_id)?.username) || 'user' })));

      // sent by me
      const { data: sent } = await supabase
        .from('group_invites')
        .select('id, invited_user_id')
        .eq('thread_id', threadId)
        .eq('invited_by', user?.id || '')
        .eq('status', 'pending');
      const sentArr = (sent as any) || [];
      const sentIds = sentArr.map((r:any)=> r.invited_user_id);
      let sentProfiles: any[] = [];
      if (sentIds.length) {
        const { data: profs2 } = await supabase.from('profiles').select('id, username').in('id', sentIds);
        sentProfiles = (profs2 as any) || [];
      }
      setSentInvites(sentArr.map((r:any)=> ({ id: r.id, username: (sentProfiles.find(p=>p.id===r.invited_user_id)?.username) || 'user' })));
    } catch {}
  };

  const invite = async () => {
    if (!username.trim()) return;
    setError(null); setInviteMsg(null);
    try {
      // Prefer result selected from search
      const selected = searchResults.find(r => r.username.toLowerCase() === username.trim().toLowerCase());
      const targetUsername = selected?.username || username.trim();
      setInvitingUserId(selected?.id || null);
      // Create a PENDING INVITE (do not add as member yet)
      const { error } = await supabase.rpc('invite_user_to_group', { p_thread: threadId, p_username: targetUsername });
      if (error) throw error;
      setInviteMsg(`Invited @${targetUsername}`);
      await reloadInvites();
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

  const saveSchedule = async () => {
    if (!threadMeta) return;
    try {
      setSavingMeta(true);
      await supabase
        .from('chat_threads')
        .update({
          frequency: threadMeta.frequency || null,
          timezone: threadMeta.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || null,
          use_round_robin: !!threadMeta.use_round_robin,
        })
        .eq('id', threadId);
    } catch (e:any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSavingMeta(false);
    }
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
        <div className="text-[11px] uppercase tracking-wide text-brand-muted">Group details</div>
        <div className="ml-auto">
          <Button size="sm" variant="outline" onClick={leave}>Leave group</Button>
        </div>
      </div>
      <div className="p-3 space-y-3 max-w-3xl">
        {/* Schedule & Settings */}
        <Card className="bg-brand-surface/70 border-brand-border/70">
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Schedule</div>
              {upcoming && (
                <div className="text-[11px] px-2 py-1 rounded-full border border-brand-border/70 text-brand-muted truncate max-w-[60%]" title={upcoming.prompt_text}>
                  Today: {upcoming.prompt_text}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-brand-muted mb-1">Frequency</label>
                <select
                  className="w-full p-2 rounded bg-brand-background border border-brand-border"
                  value={threadMeta?.frequency || ''}
                  onChange={(e)=> setThreadMeta(prev => ({ ...(prev||{}), frequency: e.target.value || null }))}
                >
                  <option value="">Not set</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-brand-muted mb-1">Timezone</label>
                <input
                  className="w-full p-2 rounded bg-brand-background border border-brand-border"
                  value={threadMeta?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || ''}
                  onChange={(e)=> setThreadMeta(prev => ({ ...(prev||{}), timezone: e.target.value }))}
                  placeholder="America/Los_Angeles"
                />
              </div>
              <div className="flex items-end">
                <label className="text-sm text-brand-text flex items-center gap-2">
                  <input type="checkbox" checked={!!threadMeta?.use_round_robin} onChange={(e)=> setThreadMeta(prev => ({ ...(prev||{}), use_round_robin: e.target.checked }))} />
                  Use round‑robin prompts
                </label>
              </div>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={saveSchedule} disabled={savingMeta}>{savingMeta ? 'Saving…' : 'Save settings'}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card className="bg-brand-surface/70 border-brand-border/70">
          <CardContent className="p-3">
            <div className="text-sm font-medium mb-2">Members</div>
            <div className="space-y-1">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={m.avatar_url || ''} alt={m.username} />
                      <AvatarFallback className="text-[10px] bg-brand-accent/20">{m.username?.slice(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="truncate">@{m.username}</span>
                    {m.role && <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-brand-border/70 text-brand-muted">{m.role}</span>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={()=>remove(m.id)}>Remove</Button>
                </div>
              ))}
              {members.length === 0 && <div className="text-brand-muted text-sm">No members yet.</div>}
            </div>
            {(receivedInvites.length > 0 || sentInvites.length > 0) && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {receivedInvites.length > 0 && (
                  <div>
                    <div className="text-xs text-brand-muted mb-1">Invites for you</div>
                    <div className="space-y-1">
                      {receivedInvites.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between text-sm py-1">
                          <span>@{inv.username}</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={async()=>{ await supabase.rpc('accept_group_invite', { p_invite: inv.id }); setReceivedInvites(prev=>prev.filter(i=>i.id!==inv.id)); }}>Accept</Button>
                            <Button size="sm" variant="ghost" onClick={async()=>{ await supabase.rpc('decline_group_invite', { p_invite: inv.id }); setReceivedInvites(prev=>prev.filter(i=>i.id!==inv.id)); }}>Decline</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {sentInvites.length > 0 && (
                  <div>
                    <div className="text-xs text-brand-muted mb-1">Invites you sent</div>
                    <div className="space-y-1">
                      {sentInvites.map(inv => (
                        <div key={inv.id} className="flex items-center justify-between text-sm py-1">
                          <span>@{inv.username}</span>
                          <div className="flex gap-2">
                            <Button size="sm" variant="ghost" onClick={async()=>{ await supabase.rpc('cancel_group_invite', { p_invite: inv.id }); setSentInvites(prev=>prev.filter(i=>i.id!==inv.id)); }}>Cancel</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
              {pendingInvites.length > 0 && (
                <div className="mt-2 text-xs text-brand-muted">Pending: {pendingInvites.map(u=>`@${u}`).join(', ')}</div>
              )}
              {error && <div className="text-brand-danger text-sm mt-1">{error}</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-brand-surface/70 border-brand-border/70">
          <CardContent className="p-3 space-y-2">
            <div className="text-sm font-medium">Bulk add prompts</div>
            <div className="text-xs text-brand-muted">Paste or upload one prompt per line. Great for seeding the queue.</div>
            <textarea className="w-full p-2 rounded bg-brand-background border border-brand-border" rows={4} placeholder="One prompt per line" value={csvText} onChange={e=>setCsvText(e.target.value)} />
            <Button onClick={uploadCsv} disabled={!csvText.trim()}>Save prompts</Button>
          </CardContent>
        </Card>

        <Card className="bg-brand-surface/70 border-brand-border/70">
          <CardContent className="p-3 space-y-2">
            <div className="text-sm font-medium">Quick generate (AI)</div>
            <div className="text-xs text-brand-muted">Describe your group and tone; AI will propose one prompt and save it. If today’s prompt is empty, it will be set automatically.</div>
            <textarea className="w-full p-2 rounded bg-brand-background border border-brand-border" rows={3} placeholder="e.g., We’re a long-distance friend group who want light, funny check-ins" value={context} onChange={e=>setContext(e.target.value)} />
            <Button onClick={generateAI} disabled={aiBusy}>{aiBusy ? 'Generating…' : 'Generate & save'}</Button>
          </CardContent>
        </Card>

        <Card className="bg-brand-surface/70 border-brand-border/70">
          <CardContent className="p-3">
            <div className="text-sm font-medium mb-2">Saved prompts</div>
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


