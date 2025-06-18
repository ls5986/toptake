import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { fixPromptWithAI } from '@/lib/openai';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { addNotification } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp, AlertCircle, History, Award } from 'lucide-react';

interface Suggestion {
  id: string;
  user_id: string;
  original_text: string;
  ai_fixed_text?: string;
  status: string;
  created_at: string;
  submitted_version?: 'original' | 'ai_fixed';
  credit_awarded: boolean;
  credit_amount: number;
  credit_awarded_at?: string;
  credit_award_reason?: string;
  version_history: any[];
  engagement_score?: number;
  safety_score?: number;
  ai_moderated: boolean;
  ai_moderation_notes?: string;
  duplicate_check_hash?: string;
  inappropriate_content_check: boolean;
  inappropriate_content_reason?: string;
  collaboration_notes?: string;
  feedback_notes?: string;
  feedback_given_at?: string;
  feedback_given_by?: string;
  scheduled_for?: string;
  scheduled_by?: string;
  scheduled_reason?: string;
  activation_status: string;
  activation_notes?: string;
  activation_date?: string;
  activation_by?: string;
  analytics_data: any;
}

interface Profile {
  id: string;
  avatar_url?: string;
  username?: string;
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
  const [creditAmount, setCreditAmount] = useState(1);
  const [creditReason, setCreditReason] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadSuggestions();
    loadStats();
  }, [filter, sortBy, sortOrder]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('prompt_suggestions')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setSuggestions(data || []);

      // Fetch user profiles
      const userIds = (data || []).map((s: Suggestion) => s.user_id);
      if (userIds.length) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, avatar_url, username')
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
      toast({ 
        title: 'Date conflict', 
        description: 'A prompt is already scheduled for this date',
        variant: 'destructive' 
      });
      return;
    }

    // Use whichever version was last edited or submitted
    const promptText = s.submitted_version === 'ai_fixed' 
      ? (editingAIFixedId === s.id ? editAIFixed : s.ai_fixed_text) 
      : (editingId === s.id ? editText : s.original_text);

    // Start transaction
    const { error: transactionError } = await supabase.rpc('begin_transaction');
    if (transactionError) throw transactionError;

    try {
      // Create daily prompt
      const { error: insertError } = await supabase
        .from('daily_prompts')
        .insert({ 
          prompt_text: promptText, 
          prompt_date: date, 
          status: 'scheduled', 
          source: 'suggestion', 
          suggestion_id: s.id 
        });

      if (insertError) throw insertError;

      // Update suggestion status
      await supabase
        .from('prompt_suggestions')
        .update({ 
          status: 'scheduled', 
          scheduled_date: date,
          scheduled_for: date,
          scheduled_by: (await supabase.auth.getUser()).data.user?.id,
          scheduled_reason: 'Approved by admin'
        })
        .eq('id', s.id);

      // Award credits if not already awarded
      if (!s.credit_awarded) {
        await supabase.rpc('award_prompt_suggestion_credits', {
          suggestion_id: s.id,
          amount: creditAmount,
          reason: creditReason || 'Approved prompt suggestion',
          awarded_by: (await supabase.auth.getUser()).data.user?.id
        });
      }

      // Notify user
      await addNotification(
        s.user_id, 
        'prompt_approved', 
        `Your prompt was approved and scheduled for ${date}. You earned ${creditAmount} credit${creditAmount > 1 ? 's' : ''}!`
      );

      // Commit transaction
      await supabase.rpc('commit_transaction');

      await loadSuggestions();
      await loadStats();
      toast({ 
        title: 'Suggestion approved & scheduled!', 
        description: `Prompt moved to daily prompts and ${creditAmount} credit${creditAmount > 1 ? 's' : ''} awarded.`,
        variant: 'default' 
      });
    } catch (error) {
      // Rollback transaction
      await supabase.rpc('rollback_transaction');
      throw error;
    }
  };

  const handleReject = async (id: string, userId: string) => {
    await supabase
      .from('prompt_suggestions')
      .update({ 
        status: 'rejected',
        feedback_notes: 'Rejected by admin',
        feedback_given_at: new Date().toISOString(),
        feedback_given_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', id);

    await addNotification(
      userId, 
      'prompt_rejected', 
      'Your prompt suggestion was rejected. Check the feedback for details.'
    );

    await loadSuggestions();
    await loadStats();
    toast({ 
      title: 'Suggestion rejected', 
      description: 'Suggestion has been rejected and feedback provided.',
      variant: 'default' 
    });
  };

  const handleBulkApprove = async () => {
    for (const id of selectedIds) {
      const s = suggestions.find(s => s.id === id);
      if (s) await handleApprove(s);
    }
    setSelectedIds([]);
    toast({ 
      title: 'Bulk approve complete', 
      description: 'Selected suggestions approved and credits awarded.',
      variant: 'default' 
    });
  };

  const handleBulkReject = async () => {
    for (const id of selectedIds) {
      const s = suggestions.find(s => s.id === id);
      if (s) await handleReject(id, s.user_id);
    }
    setSelectedIds([]);
    toast({ 
      title: 'Bulk reject complete', 
      description: 'Selected suggestions rejected and feedback provided.',
      variant: 'default' 
    });
  };

  const handleEdit = (s: Suggestion) => {
    setEditingId(s.id);
    setEditText(s.original_text);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      // Record version history
      await supabase.rpc('record_suggestion_version', {
        suggestion_id: id,
        new_text: editText,
        edited_by: (await supabase.auth.getUser()).data.user?.id,
        edit_reason: 'Edited by admin'
      });

      // Update suggestion
      await supabase
        .from('prompt_suggestions')
        .update({ original_text: editText })
        .eq('id', id);

      setEditingId(null);
      setEditText('');
      await loadSuggestions();
      toast({ 
        title: 'Original suggestion edited', 
        description: 'Original text updated and version history recorded.',
        variant: 'default' 
      });
    } catch (err) {
      toast({ 
        title: 'Error editing original suggestion', 
        description: err.message || String(err), 
        variant: 'destructive' 
      });
    }
  };

  const handleEditAIFixed = (s: Suggestion) => {
    setEditingAIFixedId(s.id);
    setEditAIFixed(s.ai_fixed_text || '');
  };

  const handleSaveAIFixed = async (id: string) => {
    try {
      // Record version history
      await supabase.rpc('record_suggestion_version', {
        suggestion_id: id,
        new_text: editAIFixed,
        edited_by: (await supabase.auth.getUser()).data.user?.id,
        edit_reason: 'AI fixed version edited by admin'
      });

      // Update suggestion
      await supabase
        .from('prompt_suggestions')
        .update({ ai_fixed_text: editAIFixed })
        .eq('id', id);

      setEditingAIFixedId(null);
      setEditAIFixed('');
      await loadSuggestions();
      toast({ 
        title: 'AI fixed version edited', 
        description: 'AI fixed text updated and version history recorded.',
        variant: 'default' 
      });
    } catch (err) {
      toast({ 
        title: 'Error editing AI fixed version', 
        description: err.message || String(err), 
        variant: 'destructive' 
      });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
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

        <div className="flex gap-2 mb-4">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="bg-brand-surface border-brand-border text-brand-text rounded p-2"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="used">Used</option>
          </select>

          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-brand-surface border-brand-border text-brand-text rounded p-2"
          >
            <option value="created_at">Date</option>
            <option value="engagement_score">Engagement</option>
            <option value="safety_score">Safety</option>
          </select>

          <select 
            value={sortOrder} 
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-brand-surface border-brand-border text-brand-text rounded p-2"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <div className="flex gap-2 mb-4">
          <Button 
            size="sm" 
            className="bg-brand-primary hover:bg-brand-accent text-brand-text" 
            onClick={handleBulkApprove} 
            disabled={selectedIds.length === 0}
          >
            Bulk Approve
          </Button>
          <Button 
            size="sm" 
            className="bg-brand-danger hover:bg-brand-primary text-brand-text" 
            onClick={handleBulkReject} 
            disabled={selectedIds.length === 0}
          >
            Bulk Reject
          </Button>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div>Loading...</div>
          ) : suggestions.length === 0 ? (
            <div className="text-brand-muted">No suggestions.</div>
          ) : (
            suggestions.map(s => (
              <div key={s.id} className="border rounded p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-brand-surface border-brand-border text-xs sm:text-sm">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(s.id)} 
                    onChange={() => toggleSelect(s.id)} 
                  />
                  {profiles[s.user_id]?.avatar_url ? (
                    <img 
                      src={profiles[s.user_id].avatar_url} 
                      alt="avatar" 
                      className="w-8 h-8 rounded-full border border-brand-border" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-muted flex items-center justify-center text-brand-primary font-bold">
                      {profiles[s.user_id]?.username?.[0] || '?'}
                    </div>
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
                    <div className="font-semibold text-brand-primary truncate">
                      {s.original_text}
                    </div>
                  )}

                  <div className="text-xs text-brand-muted">
                    {new Date(s.created_at).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2 mt-1">
                    <Badge className="bg-brand-warning text-brand-text">
                      {s.status}
                    </Badge>
                    {s.credit_awarded && (
                      <Badge className="bg-brand-success text-brand-text">
                        {s.credit_amount} credit{s.credit_amount > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {s.ai_moderated && (
                      <Badge className="bg-brand-info text-brand-text">
                        AI Moderated
                      </Badge>
                    )}
                  </div>

                  {s.version_history?.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowVersionHistory(showVersionHistory === s.id ? null : s.id)}
                      className="mt-1"
                    >
                      <History className="h-4 w-4 mr-1" />
                      Version History
                    </Button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-0">
                  {editingId === s.id ? (
                    <Button 
                      size="sm" 
                      onClick={() => handleSaveEdit(s.id)} 
                      className="bg-brand-primary hover:bg-brand-accent text-brand-text"
                    >
                      Save
                    </Button>
                  ) : (
                    <>
                      <Button 
                        size="sm" 
                        onClick={() => handleApprove(s)} 
                        className="bg-brand-primary hover:bg-brand-accent text-brand-text"
                      >
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleReject(s.id, s.user_id)} 
                        className="bg-brand-danger hover:bg-brand-primary text-brand-text"
                      >
                        Reject
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => handleEdit(s)} 
                        className="bg-brand-muted text-brand-primary border border-brand-border"
                      >
                        Edit
                      </Button>
                    </>
                  )}
                </div>

                {showVersionHistory === s.id && (
                  <div className="col-span-full mt-2 p-2 bg-brand-surface border border-brand-border rounded">
                    <h4 className="font-semibold mb-2">Version History</h4>
                    <ScrollArea className="h-40">
                      {s.version_history.map((version, index) => (
                        <div key={index} className="mb-2 p-2 bg-brand-background rounded">
                          <div className="text-xs text-brand-muted">
                            {new Date(version.edited_at).toLocaleString()}
                          </div>
                          <div className="text-sm">{version.text}</div>
                          <div className="text-xs text-brand-muted">
                            {version.edit_reason}
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PromptSuggestionInbox; 