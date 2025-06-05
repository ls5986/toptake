import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { fixPromptWithAI } from '@/lib/openai';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';

interface Suggestion {
  id: string;
  user_id: string;
  suggestion_text: string;
  status: string;
  created_at: string;
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
    try {
      const { error: insertError } = await supabase
        .from('daily_prompts')
        .insert({ prompt_text: s.suggestion_text, prompt_date: null, status: 'unscheduled', source: 'suggestion', suggestion_id: s.id });
      if (insertError) throw insertError;
      await supabase
        .from('prompt_suggestions')
        .update({ status: 'used' })
        .eq('id', s.id);
      await loadSuggestions();
      await loadStats();
      toast({ title: 'Suggestion approved!', description: 'Prompt moved to daily prompts.', variant: 'default' });
    } catch (err) {
      toast({ title: 'Error approving suggestion', description: err.message || String(err), variant: 'destructive' });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await supabase
        .from('prompt_suggestions')
        .update({ status: 'rejected' })
        .eq('id', id);
      await loadSuggestions();
      await loadStats();
      toast({ title: 'Suggestion rejected', description: 'Suggestion has been rejected.', variant: 'default' });
    } catch (err) {
      toast({ title: 'Error rejecting suggestion', description: err.message || String(err), variant: 'destructive' });
    }
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
      await handleReject(id);
    }
    setSelectedIds([]);
    toast({ title: 'Bulk reject complete', description: 'Selected suggestions rejected.', variant: 'default' });
  };

  const handleEdit = (s: Suggestion) => {
    setEditingId(s.id);
    setEditText(s.suggestion_text);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await supabase
        .from('prompt_suggestions')
        .update({ suggestion_text: editText })
        .eq('id', id);
      setEditingId(null);
      setEditText('');
      await loadSuggestions();
      toast({ title: 'Suggestion edited', description: 'Suggestion text updated.', variant: 'default' });
    } catch (err) {
      toast({ title: 'Error editing suggestion', description: err.message || String(err), variant: 'destructive' });
    }
  };

  const handleFixWithAI = async (s: Suggestion) => {
    setAiLoadingId(s.id);
    try {
      const improved = await fixPromptWithAI(s.suggestion_text);
      setEditingId(s.id);
      setEditText(improved);
      toast({ title: 'AI improved suggestion!', description: 'Suggestion text was improved by AI.', variant: 'default' });
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
                  <div className="font-semibold text-brand-primary truncate">{s.suggestion_text}</div>
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
                    <Button size="sm" onClick={() => handleReject(s.id)} className="bg-brand-danger hover:bg-brand-primary text-brand-text">Reject</Button>
                    <Button size="sm" onClick={() => handleEdit(s)} className="bg-brand-muted text-brand-primary border border-brand-border">Edit</Button>
                    <Button size="sm" onClick={() => handleFixWithAI(s)} className="bg-brand-surface text-brand-primary border border-brand-border" disabled={aiLoadingId === s.id}>{aiLoadingId === s.id ? (<><Spinner />Thinking...</>) : 'Fix with AI'}</Button>
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