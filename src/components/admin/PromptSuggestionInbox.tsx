import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { fixPromptWithAI } from '@/lib/openai';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { addNotification } from '@/lib/supabase';

interface Suggestion {
  id: string;
  user_id: string;
  original_text: string;
  ai_fixed_text?: string;
  status: string;
  created_at: string;
  submitted_version?: 'original' | 'ai_fixed';
}

interface Profile {
  id: string;
  avatar_url?: string;
}

const Spinner = () => (
  <div className="flex justify-center items-center my-2">
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-accent" />
  </div>
);

const PromptSuggestionInbox: React.FC = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [aiLoadingId, setAiLoadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, used: 0 });
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const { toast } = useToast();
  const [editAIFixed, setEditAIFixed] = useState('');
  const [editingAIFixedId, setEditingAIFixedId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');

  useEffect(() => {
    loadSuggestions();
    loadStats();
  }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompt_suggestions')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSuggestions(data || []);
      // Fetch user avatars
      const userIds = (data || []).map((s: Suggestion) => s.user_id);
      if (userIds.length) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, avatar_url')
          .in('id', userIds);
        const profileMap: Record<string, Profile> = {};
        (profileData || []).forEach((p: Profile) => { profileMap[p.id] = p; });
        setProfiles(profileMap);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    const statuses = ['pending', 'approved', 'rejected', 'used'];
    const statObj: any = {};
    for (const status of statuses) {
      const { count } = await supabase
        .from('prompt_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('status', status);
      statObj[status] = count || 0;
    }
    setStats(statObj);
  };

  const handleApprove = async (s: Suggestion) => {
    // Ask for date
    let date = scheduleDate;
    if (!date) {
      date = prompt('Enter date to schedule this prompt (YYYY-MM-DD):') || '';
    }
    if (!date) return;
    // Check for duplicate
    const { data: existing } = await supabase
      .from('daily_prompts')
      .select('id')
      .eq('prompt_date', date)
      .single();
    if (existing) {
      toast({ title: 'A prompt for this date already exists. Please choose another date.', variant: 'destructive' });
      return;
    }
    // Use whichever version was last edited or submitted
    const promptText = s.submitted_version === 'ai_fixed' ? (editingAIFixedId === s.id ? editAIFixed : s.ai_fixed_text) : (editingId === s.id ? editText : s.original_text);
    const { error: insertError } = await supabase
      .from('daily_prompts')
      .insert({ prompt_text: promptText, prompt_date: date, status: 'scheduled', source: 'suggestion', suggestion_id: s.id });
    if (insertError) throw insertError;
    await supabase
      .from('prompt_suggestions')
      .update({ status: 'scheduled', scheduled_date: date })
      .eq('id', s.id);
    await addNotification(s.user_id, 'prompt_approved', `Your prompt was approved and scheduled for ${date}`);
    await loadSuggestions();
    await loadStats();
    toast({ title: 'Suggestion approved & scheduled!', description: 'Prompt moved to daily prompts.', variant: 'default' });
  };

  const handleReject = async (id: string, userId: string) => {
    await supabase
      .from('prompt_suggestions')
      .update({ status: 'rejected' })
      .eq('id', id);
    await addNotification(userId, 'prompt_rejected', 'Your prompt suggestion was rejected.');
    await loadSuggestions();
    await loadStats();
    toast({ title: 'Suggestion rejected', description: 'Suggestion has been rejected.', variant: 'default' });
  };

  const handleBulkApprove = async () => {
    for (const id of selectedIds) {
      const s = suggestions.find(s => s.id === id);
      if (s) await handleApprove(s);
    }
    setSelectedIds([]);
    toast({ title: 'Bulk approve complete', description: 'Selected suggestions approved.', variant: 'default' });
  };

  const handleBulkReject = async () => {
    for (const id of selectedIds) {
      const s = suggestions.find(s => s.id === id);
      if (s) await handleReject(id, s.user_id);
    }
    setSelectedIds([]);
    toast({ title: 'Bulk reject complete', description: 'Selected suggestions rejected.', variant: 'default' });
  };

  const handleEdit = (s: Suggestion) => {
    setEditingId(s.id);
    setEditText(s.original_text);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await supabase
        .from('prompt_suggestions')
        .update({ original_text: editText })
        .eq('id', id);
      setEditingId(null);
      setEditText('');
      await loadSuggestions();
      toast({ title: 'Original suggestion edited', description: 'Original text updated.', variant: 'default' });
    } catch (err) {
      toast({ title: 'Error editing original suggestion', description: err.message || String(err), variant: 'destructive' });
    }
  };

  const handleEditAIFixed = (s: Suggestion) => {
    setEditingAIFixedId(s.id);
    setEditAIFixed(s.ai_fixed_text || '');
  };

  const handleSaveEditAIFixed = async (id: string) => {
    await supabase
      .from('prompt_suggestions')
      .update({ ai_fixed_text: editAIFixed })
      .eq('id', id);
    setEditingAIFixedId(null);
    setEditAIFixed('');
    await loadSuggestions();
    toast({ title: 'AI-fixed suggestion edited', description: 'AI-fixed text updated.', variant: 'default' });
  };

  const handleFixWithAIOriginal = async (s: Suggestion) => {
    setAiLoadingId(s.id);
    try {
      const improved = await fixPromptWithAI(s.original_text);
      setEditingAIFixedId(s.id);
      setEditAIFixed(improved);
      toast({ title: 'AI improved suggestion!', description: 'AI-fixed text updated.', variant: 'default' });
    } catch (err: any) {
      toast({ title: 'AI error', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setAiLoadingId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Prompt Suggestions Inbox</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <span className="text-brand-primary font-semibold text-sm">Pending: {stats.pending}</span>
          <span className="text-brand-accent font-semibold text-sm">Approved: {stats.approved}</span>
          <span className="text-brand-danger font-semibold text-sm">Rejected: {stats.rejected}</span>
          <span className="text-brand-primary font-semibold text-sm">Used: {stats.used}</span>
        </div>
        <div className="flex gap-2 mb-2">
          <Button size="sm" className="bg-brand-primary hover:bg-brand-accent text-brand-text" onClick={handleBulkApprove} disabled={selectedIds.length === 0}>Bulk Approve</Button>
          <Button size="sm" className="bg-brand-danger hover:bg-brand-primary text-brand-text" onClick={handleBulkReject} disabled={selectedIds.length === 0}>Bulk Reject</Button>
        </div>
        <div className="space-y-4">
          {loading ? <div>Loading...</div> : suggestions.length === 0 ? <div className="text-brand-muted">No suggestions.</div> : suggestions.map(s => (
            <div key={s.id} className="border rounded p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-brand-surface border-brand-border text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSelect(s.id)} />
                {profiles[s.user_id]?.avatar_url ? (
                  <img src={profiles[s.user_id].avatar_url} alt="avatar" className="w-8 h-8 rounded-full border border-brand-border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-muted flex items-center justify-center text-brand-primary font-bold">?</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                {editingId === s.id ? (
                  <Input
                    className="w-full mb-2 p-2 rounded bg-brand-surface text-brand-primary"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                  />
                ) : (
                  <div className="font-semibold text-brand-primary truncate">{s.original_text}</div>
                )}
                <div className="text-xs text-brand-muted">{s.created_at}</div>
                <div className="text-xs text-brand-accent">Status: {s.status}</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                {editingId === s.id ? (
                  <Button size="sm" onClick={() => handleSaveEdit(s.id)} className="bg-brand-primary hover:bg-brand-accent text-brand-text">Save</Button>
                ) : (
                  <>
                    <Button size="sm" onClick={() => handleApprove(s)} className="bg-brand-primary hover:bg-brand-accent text-brand-text">Approve</Button>
                    <Button size="sm" onClick={() => handleReject(s.id, s.user_id)} className="bg-brand-danger hover:bg-brand-primary text-brand-text">Reject</Button>
                    <Button size="sm" onClick={() => handleEdit(s)} className="bg-brand-muted text-brand-primary border border-brand-border">Edit</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PromptSuggestionInbox; 