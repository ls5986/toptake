import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Calendar, Plus, User, History, AlertCircle } from 'lucide-react';
import { fixPromptWithAI } from '@/lib/openai';

interface PromptRecommendation {
  id: string;
  prompt_text: string;
  user_id: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected' | 'scheduled';
  created_at: string;
  feedback_notes?: string;
  scheduled_for?: string;
  credit_awarded: boolean;
  credit_amount: number;
  version_history?: any[];
}

const PromptRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<PromptRecommendation[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<PromptRecommendation[]>([]);
  const [scheduleDate, setScheduleDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [newPrompt, setNewPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [aiFixedPrompt, setAiFixedPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [showAIPreview, setShowAIPreview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState<string | null>(null);
  const { user } = useAppContext();
  const isAdmin = Boolean((user as any)?.is_admin);
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
    loadUserSubmissions();
    const today = new Date().toISOString().split('T')[0];
    setScheduleDate(today);
  }, []);

  const attachUsernames = async (rows: any[]): Promise<PromptRecommendation[]> => {
    const ids = Array.from(new Set(rows.map(r => r.user_id))).filter(Boolean);
    let idToUsername: Record<string, string> = {};
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id, username').in('id', ids);
      (profiles || []).forEach((p: any) => { idToUsername[p.id] = p.username; });
    }
    return rows.map(r => ({ ...r, username: idToUsername[r.user_id] || 'User' }));
  };

  const loadRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_recommendations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const formatted = await attachUsernames(data || []);
      setRecommendations(formatted as any);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserSubmissions = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('prompt_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const formatted = await attachUsernames(data || []);
      setUserSubmissions(formatted);
    } catch (error) {
      console.error('Error loading user submissions:', error);
    }
  };

  const handleFixWithAI = async () => {
    if (!newPrompt.trim()) return;
    setAiLoading(true);
    try {
      const fixed = await fixPromptWithAI(newPrompt);
      setAiFixedPrompt(fixed);
      setShowAIPreview(true);
    } catch (error) {
      console.error('Error fixing with AI:', error);
      toast({ title: 'Error fixing with AI', description: 'Failed to improve prompt with AI. Please try again.', variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const submitRecommendation = async (useAIFixed = false) => {
    if (!newPrompt.trim() || !user) return;
    setSubmitting(true);
    try {
      const text = (useAIFixed ? aiFixedPrompt : newPrompt).trim();
      if (!text) { setSubmitting(false); return; }
      const { error } = await supabase
        .from('prompt_recommendations')
        .insert({ user_id: user.id, prompt_text: text, status: 'pending' });
      if (error) throw error;
      setNewPrompt('');
      setAiFixedPrompt('');
      setShowAIPreview(false);
      await Promise.all([loadRecommendations(), loadUserSubmissions()]);
      toast({ title: 'Prompt suggestion submitted!', description: 'Your suggestion is now pending review.' });
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      toast({ title: 'Error submitting suggestion', description: 'Failed to submit suggestion. Please try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const approveAndSchedule = async (rec: PromptRecommendation) => {
    if (!isAdmin) return;
    const date = scheduleDate || prompt('Enter date to schedule this prompt (YYYY-MM-DD):') || '';
    if (!date) return;

    // Check conflict
    const { data: existing } = await supabase
      .from('daily_prompts')
      .select('id')
      .eq('prompt_date', date)
      .maybeSingle();
    if (existing) {
      toast({ title: 'Date conflict', description: 'A prompt for this date already exists.', variant: 'destructive' });
      return;
    }

    // Insert prompt and update recommendation
    const { error: insErr } = await supabase
      .from('daily_prompts')
      .insert({ prompt_text: rec.prompt_text, prompt_date: date, is_active: true, source: 'recommendation' });
    if (insErr) {
      toast({ title: 'Error scheduling', description: insErr.message, variant: 'destructive' });
      return;
    }

    await supabase
      .from('prompt_recommendations')
      .update({ status: 'scheduled', scheduled_for: date })
      .eq('id', rec.id);

    // Optional: award 1 credit to the suggester
    try {
      await supabase.rpc('grant_credit', { p_user: rec.user_id, p_type: 'extra_takes', p_amount: 1, p_description: 'Approved prompt suggestion' });
    } catch {}

    await loadRecommendations();
    await loadUserSubmissions();
    toast({ title: 'Prompt scheduled!', description: 'Prompt has been scheduled and credits awarded.' });
  };

  const rejectRecommendation = async (id: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase
        .from('prompt_recommendations')
        .update({ status: 'rejected', feedback_notes: 'Rejected by admin' })
        .eq('id', id);
      if (error) throw error;
      await loadRecommendations();
      await loadUserSubmissions();
      toast({ title: 'Recommendation rejected', description: 'Suggestion has been rejected.' });
    } catch (error) {
      console.error('Error rejecting recommendation:', error);
      toast({ title: 'Error rejecting recommendation', description: 'Failed to reject suggestion.', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-brand-success';
      case 'rejected': return 'bg-brand-danger';
      case 'scheduled': return 'bg-brand-info';
      default: return 'bg-brand-warning';
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-brand-muted">Loading recommendations...</div>;
  }

  return (
    <div className="space-y-4 bg-brand-background min-h-screen p-4">
      <Card className="bg-brand-surface border-brand-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-brand-text">
            <Plus className="w-5 h-5" />
            Suggest a Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea placeholder="Share your prompt idea..." value={newPrompt} onChange={(e) => setNewPrompt(e.target.value)} rows={3} />
          <Button onClick={handleFixWithAI} disabled={!newPrompt.trim() || submitting} className="btn-primary w-full">{aiLoading ? 'Fixing with AI...' : 'Fix with AI'}</Button>
          <Button onClick={() => submitRecommendation(false)} disabled={!newPrompt.trim() || submitting} className="btn-primary w-full">{submitting ? 'Submitting...' : 'Submit Original'}</Button>
          <Button onClick={() => submitRecommendation(true)} disabled={!aiFixedPrompt.trim() || submitting} className="btn-primary w-full">{submitting ? 'Submitting...' : 'Submit AI Fixed'}</Button>
        </CardContent>
      </Card>

      {showAIPreview && (
        <Card className="bg-brand-surface border-brand-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-brand-text">
              <AlertCircle className="w-5 h-5" />
              AI-Improved Version
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-brand-background rounded-lg">
              <p className="text-brand-text">{aiFixedPrompt}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-brand-surface border-brand-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-brand-text">
            <User className="w-5 h-5" />
            Your Submissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {userSubmissions.map((submission) => (
                <div key={submission.id} className="p-4 border border-border rounded-lg bg-brand-surface">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-brand-text">{submission.prompt_text}</div>
                      <div className="text-sm text-brand-muted">{new Date(submission.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(submission.status)}>{submission.status}</Badge>
                      {submission.credit_awarded && (
                        <Badge className="bg-brand-success">{submission.credit_amount} credit{submission.credit_amount > 1 ? 's' : ''}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {userSubmissions.length === 0 && (<div className="text-center text-brand-muted py-8">No submissions yet</div>)}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Card className="bg-brand-surface border-brand-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-brand-text">Schedule Date</CardTitle>
            </CardHeader>
            <CardContent>
              <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="bg-brand-surface border-brand-border text-brand-text" />
            </CardContent>
          </Card>
          <Card className="bg-brand-surface border-brand-border">
            <CardHeader>
              <CardTitle className="text-brand-text">Pending Recommendations ({recommendations.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="p-4 border border-border rounded-lg bg-brand-surface">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-brand-text">{rec.username}</div>
                          <div className="text-sm text-brand-muted">{new Date(rec.created_at).toLocaleDateString()}</div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-brand-warning text-brand-text">{rec.status}</Badge>
                        </div>
                      </div>
                      <div className="bg-brand-surface p-3 rounded mb-3">
                        <p className="text-sm text-brand-text">{rec.prompt_text}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveAndSchedule(rec)} className="btn-primary">Approve & Schedule</Button>
                        <Button size="sm" onClick={() => rejectRecommendation(rec.id)} className="btn-secondary">Decline</Button>
                      </div>
                    </div>
                  ))}
                  {recommendations.length === 0 && (<div className="text-center text-brand-muted py-8">No pending recommendations</div>)}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PromptRecommendations;