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
import { Calendar, Plus, User, History, Award, AlertCircle } from 'lucide-react';
import { fixPromptWithAI } from '@/lib/openai';

interface PromptRecommendation {
  id: string;
  prompt_text: string;
  user_id: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  cleaned_text?: string;
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
  const { user, isAdmin } = useAppContext();
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
    loadUserSubmissions();
    const today = new Date().toISOString().split('T')[0];
    setScheduleDate(today);
  }, []);

  const loadRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_recommendations')
        .select(`
          *,
          profiles!inner(username)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const formatted = data?.map(rec => ({
        ...rec,
        username: rec.profiles.username
      })) || [];
      
      setRecommendations(formatted);
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
        .select(`
          *,
          profiles!inner(username)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      const formatted = data?.map(rec => ({
        ...rec,
        username: rec.profiles.username
      })) || [];
      
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
      toast({ 
        title: 'Error fixing with AI', 
        description: 'Failed to improve prompt with AI. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setAiLoading(false);
    }
  };

  const submitRecommendation = async (useAIFixed = false) => {
    if (!newPrompt.trim() || !user) return;
    setSubmitting(true);
    try {
      // Check for duplicates
      const { data: duplicateCheck } = await supabase.rpc('check_duplicate_suggestion', {
        suggestion_text: useAIFixed ? aiFixedPrompt : newPrompt
      });

      if (duplicateCheck) {
        toast({ 
          title: 'Duplicate suggestion', 
          description: 'A similar suggestion was recently submitted. Please try a different prompt.',
          variant: 'destructive' 
        });
        return;
      }

      // Start transaction
      // Guard: transaction RPCs may not exist in DB; proceed without if unavailable
      try { await supabase.rpc('begin_transaction'); } catch {}

      try {
        // Insert suggestion
        const { error: insertError } = await supabase
          .from('prompt_suggestions')
          .insert({
            original_text: newPrompt.trim(),
            ai_fixed_text: aiFixedPrompt.trim(),
            user_id: user.id,
            status: 'pending',
            submitted_version: useAIFixed ? 'ai_fixed' : 'original',
            version_history: [{
              text: useAIFixed ? aiFixedPrompt.trim() : newPrompt.trim(),
              edited_by: user.id,
              edit_reason: 'Initial submission',
              edited_at: new Date().toISOString()
            }]
          });

        if (insertError) throw insertError;

        // Record version history
        await supabase.rpc('record_suggestion_version', {
          suggestion_id: insertError.id,
          new_text: useAIFixed ? aiFixedPrompt.trim() : newPrompt.trim(),
          edited_by: user.id,
          edit_reason: 'Initial submission'
        });

        // Notify user
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'prompt_submitted',
          message: 'Your prompt suggestion was submitted!'
        });

        // Commit transaction
        try { await supabase.rpc('commit_transaction'); } catch {}

        setNewPrompt('');
        setAiFixedPrompt('');
        setShowAIPreview(false);
        loadRecommendations();
        loadUserSubmissions();
        toast({ 
          title: 'Prompt suggestion submitted!',
          description: 'Your suggestion is now pending review.',
          variant: 'default'
        });
      } catch (error) {
        // Rollback transaction
        try { await supabase.rpc('rollback_transaction'); } catch {}
        throw error;
      }
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      toast({ 
        title: 'Error submitting suggestion', 
        description: 'Failed to submit suggestion. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const approveAndSchedule = async (recommendation: PromptRecommendation) => {
    // Ask for date
    const scheduleDate = prompt('Enter date to schedule this prompt (YYYY-MM-DD):');
    if (!scheduleDate) return;

    // Check for duplicate
    const { data: existing, error: fetchError } = await supabase
      .from('daily_prompts')
      .select('id')
      .eq('prompt_date', scheduleDate)
      .single();

    if (existing) {
      toast({ 
        title: 'Date conflict', 
        description: 'A prompt for this date already exists. Please choose another date.',
        variant: 'destructive' 
      });
      return;
    }

    // Start transaction
    try { await supabase.rpc('begin_transaction'); } catch {}

    try {
      // Schedule prompt
      const { error: insertError } = await supabase
        .from('daily_prompts')
        .insert({
          prompt_text: recommendation.prompt_text,
          prompt_date: scheduleDate,
          is_active: true,
          source: 'recommendation',
          suggestion_id: recommendation.id
        });

      if (insertError) throw insertError;

      // Mark recommendation as scheduled
      await supabase
        .from('prompt_recommendations')
        .update({ 
          status: 'scheduled',
          scheduled_for: scheduleDate,
          scheduled_by: (await supabase.auth.getUser()).data.user?.id,
          scheduled_reason: 'Approved by admin'
        })
        .eq('id', recommendation.id);

      // Award credits if not already awarded
      if (!recommendation.credit_awarded) {
        await supabase.rpc('award_prompt_suggestion_credits', {
          suggestion_id: recommendation.id,
          amount: 1,
          reason: 'Approved prompt suggestion',
          awarded_by: (await supabase.auth.getUser()).data.user?.id
        });
      }

      // Notify user
      await supabase.from('notifications').insert({
        user_id: recommendation.user_id,
        type: 'prompt_approved',
        message: `Your prompt was approved and scheduled for ${scheduleDate}!`
      });

      // Commit transaction
      try { await supabase.rpc('commit_transaction'); } catch {}

      toast({ 
        title: 'Prompt scheduled!',
        description: 'Prompt has been scheduled and credits awarded.',
        variant: 'default'
      });
      loadRecommendations();
      loadUserSubmissions();
    } catch (error) {
      // Rollback transaction
      try { await supabase.rpc('rollback_transaction'); } catch {}
      throw error;
    }
  };

  const rejectRecommendation = async (id: string) => {
    try {
      // Start transaction
      try { await supabase.rpc('begin_transaction'); } catch {}

      try {
        // Update recommendation status
        const { error: updateError } = await supabase
          .from('prompt_recommendations')
          .update({ 
            status: 'rejected',
            feedback_notes: 'Rejected by admin',
            feedback_given_at: new Date().toISOString(),
            feedback_given_by: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('id', id);

        if (updateError) throw updateError;

        // Notify user
        const { data: recommendation } = await supabase
          .from('prompt_recommendations')
          .select('user_id')
          .eq('id', id)
          .single();

        if (recommendation) {
          await supabase.from('notifications').insert({
            user_id: recommendation.user_id,
            type: 'prompt_rejected',
            message: 'Your prompt suggestion was rejected. Check the feedback for details.'
          });
        }

        // Commit transaction
        try { await supabase.rpc('commit_transaction'); } catch {}

        loadRecommendations();
        loadUserSubmissions();
        toast({ 
          title: 'Recommendation rejected',
          description: 'Suggestion has been rejected and feedback provided.',
          variant: 'default'
        });
      } catch (error) {
        // Rollback transaction
        try { await supabase.rpc('rollback_transaction'); } catch {}
        throw error;
      }
    } catch (error) {
      console.error('Error rejecting recommendation:', error);
      toast({ 
        title: 'Error rejecting recommendation',
        description: 'Failed to reject suggestion. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-brand-success';
      case 'rejected': return 'bg-brand-danger';
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
          <Textarea
            placeholder="Share your prompt idea..."
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            rows={3}
            className=""
          />
          <Button 
            onClick={handleFixWithAI}
            disabled={!newPrompt.trim() || submitting}
            className="btn-primary w-full"
          >
            {aiLoading ? 'Fixing with AI...' : 'Fix with AI'}
          </Button>
          <Button 
            onClick={() => submitRecommendation(false)}
            disabled={!newPrompt.trim() || submitting}
            className="btn-primary w-full"
          >
            {submitting ? 'Submitting...' : 'Submit Original'}
          </Button>
          <Button 
            onClick={() => submitRecommendation(true)}
            disabled={!aiFixedPrompt.trim() || submitting}
            className="btn-primary w-full"
          >
            {submitting ? 'Submitting...' : 'Submit AI Fixed'}
          </Button>
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
                      <div className="text-sm text-brand-muted">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={getStatusColor(submission.status)}>
                        {submission.status}
                      </Badge>
                      {submission.credit_awarded && (
                        <Badge className="bg-brand-success">
                          {submission.credit_amount} credit{submission.credit_amount > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {submission.feedback_notes && (
                    <div className="mt-2 p-2 bg-brand-background rounded">
                      <div className="text-sm text-brand-muted">Feedback:</div>
                      <div className="text-sm text-brand-text">{submission.feedback_notes}</div>
                    </div>
                  )}

                  {submission.version_history?.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowVersionHistory(showVersionHistory === submission.id ? null : submission.id)}
                      className="mt-2"
                    >
                      <History className="h-4 w-4 mr-1" />
                      Version History
                    </Button>
                  )}

                  {showVersionHistory === submission.id && (
                    <div className="mt-2 p-2 bg-brand-background rounded">
                      <h4 className="font-semibold mb-2">Version History</h4>
                      <ScrollArea className="h-40">
                        {submission.version_history.map((version, index) => (
                          <div key={index} className="mb-2 p-2 bg-brand-surface rounded">
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
              ))}

              {userSubmissions.length === 0 && (
                <div className="text-center text-brand-muted py-8">
                  No submissions yet
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {isAdmin && (
        <>
          <Card className="bg-brand-surface border-brand-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-brand-text">
                <Calendar className="w-5 h-5" />
                Schedule Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="bg-brand-surface border-brand-border text-brand-text"
              />
            </CardContent>
          </Card>
          
          <Card className="bg-brand-surface border-brand-border">
            <CardHeader>
              <CardTitle className="text-brand-text">
                Pending Recommendations ({recommendations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="p-4 border border-border rounded-lg bg-brand-surface">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-brand-text">{rec.username}</div>
                          <div className="text-sm text-brand-muted">
                            {new Date(rec.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className="bg-brand-warning text-brand-text">{rec.status}</Badge>
                          {rec.ai_moderated && (
                            <Badge className="bg-brand-info text-brand-text">AI Moderated</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-brand-surface p-3 rounded mb-3">
                        <p className="text-sm text-brand-text">{rec.prompt_text}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => approveAndSchedule(rec)}
                          className="btn-primary"
                        >
                          Approve & Schedule
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => rejectRecommendation(rec.id)}
                          className="btn-secondary"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {recommendations.length === 0 && (
                    <div className="text-center text-brand-muted py-8">
                      No pending recommendations
                    </div>
                  )}
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