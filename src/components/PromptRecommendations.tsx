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
import { Calendar, Plus, User } from 'lucide-react';

interface PromptRecommendation {
  id: string;
  prompt_text: string;
  user_id: string;
  username: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  cleaned_text?: string;
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
  const { user, isAdmin } = useAppContext();
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
    loadUserSubmissions();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
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
    setAiLoading(true);
    try {
      const improved = await fixPromptWithAI(newPrompt);
      setAiFixedPrompt(improved);
      setShowAIPreview(true);
    } catch (err) {
      toast({ title: 'AI error', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const submitRecommendation = async (useAIFixed = false) => {
    if (!newPrompt.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('prompt_suggestions')
        .insert({
          original_text: newPrompt.trim(),
          ai_fixed_text: aiFixedPrompt.trim(),
          user_id: user.id,
          status: 'pending',
          submitted_version: useAIFixed ? 'ai_fixed' : 'original'
        });
      if (error) throw error;
      setNewPrompt('');
      setAiFixedPrompt('');
      setShowAIPreview(false);
      loadRecommendations();
      loadUserSubmissions();
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'prompt_submitted',
        message: 'Your prompt suggestion was submitted!'
      });
      toast({ title: 'Prompt suggestion submitted!' });
    } catch (error) {
      toast({ title: 'Error submitting suggestion', variant: 'destructive' });
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
      toast({ title: 'A prompt for this date already exists. Please choose another date.', variant: 'destructive' });
      return;
    }
    // Schedule prompt
    const { error } = await supabase
      .from('daily_prompts')
      .insert({
        prompt_text: recommendation.prompt_text,
        prompt_date: scheduleDate,
        is_active: true,
        source: 'recommendation'
      });
    if (error) {
      toast({ title: 'Error scheduling prompt', variant: 'destructive' });
      return;
    }
    // Mark recommendation as scheduled
    await supabase
      .from('prompt_recommendations')
      .update({ status: 'scheduled' })
      .eq('id', recommendation.id);
    toast({ title: 'Prompt scheduled!' });
    loadRecommendations();
    loadUserSubmissions();
  };

  const rejectRecommendation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prompt_recommendations')
        .update({ status: 'rejected' })
        .eq('id', id);
      
      if (error) throw error;
      
      loadRecommendations();
      loadUserSubmissions();
      toast({ title: 'Recommendation rejected' });
    } catch (error) {
      console.error('Error rejecting recommendation:', error);
      toast({ title: 'Error rejecting recommendation', variant: 'destructive' });
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

      <Card className="bg-brand-surface border-brand-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-brand-text">
            <User className="w-5 h-5" />
            Your Submissions ({userSubmissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {userSubmissions.map((sub) => (
                <div key={sub.id} className="p-4 border border-border rounded-lg bg-brand-surface">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-brand-muted">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </div>
                    <Badge className={`${getStatusColor(sub.status)} text-brand-text`}>
                      {sub.status}
                    </Badge>
                  </div>
                  <div className="bg-brand-surface p-3 rounded text-brand-text">
                    <p className="text-sm">{sub.prompt_text}</p>
                  </div>
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
                        <Badge className="bg-brand-warning text-brand-text">{rec.status}</Badge>
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