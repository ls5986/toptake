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

  const submitRecommendation = async () => {
    if (!newPrompt.trim() || !user) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('prompt_recommendations')
        .insert({
          prompt_text: newPrompt.trim(),
          user_id: user.id,
          status: 'pending'
        });
      
      if (error) throw error;
      
      setNewPrompt('');
      loadRecommendations();
      loadUserSubmissions();
      toast({ title: 'Prompt suggestion submitted!' });
    } catch (error) {
      console.error('Error submitting recommendation:', error);
      toast({ title: 'Error submitting suggestion', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const approveAndSchedule = async (recommendation: PromptRecommendation) => {
    if (!scheduleDate) {
      toast({ title: 'Please select a date', variant: 'destructive' });
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('daily_prompts')
        .select('id')
        .eq('scheduled_for', scheduleDate)
        .single();

      if (existing) {
        toast({ title: 'Date already has a scheduled prompt', variant: 'destructive' });
        return;
      }

      const promptText = recommendation.cleaned_text || recommendation.prompt_text;
      const { error: scheduleError } = await supabase
        .from('daily_prompts')
        .insert({
          prompt: promptText,
          prompt_text: promptText,
          scheduled_for: scheduleDate,
          is_active: false,
          source: 'user_recommendation',
          source_user_id: recommendation.user_id
        });
      
      if (scheduleError) throw scheduleError;
      
      const { error: updateError } = await supabase
        .from('prompt_recommendations')
        .update({ status: 'approved' })
        .eq('id', recommendation.id);
      
      if (updateError) throw updateError;
      
      loadRecommendations();
      loadUserSubmissions();
      toast({ title: `Prompt scheduled for ${scheduleDate}!` });
    } catch (error) {
      console.error('Error scheduling prompt:', error);
      toast({ title: 'Error scheduling prompt', variant: 'destructive' });
    }
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
      case 'approved': return 'bg-green-600';
      case 'rejected': return 'bg-red-600';
      default: return 'bg-yellow-600';
    }
  };

  if (loading) {
    return <div className="text-center py-4 text-gray-300">Loading recommendations...</div>;
  }

  return (
    <div className="space-y-4 bg-gray-900 min-h-screen p-4">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
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
            className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
          />
          <Button 
            onClick={submitRecommendation}
            disabled={!newPrompt.trim() || submitting}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? 'Submitting...' : 'Submit Suggestion'}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <User className="w-5 h-5" />
            Your Submissions ({userSubmissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {userSubmissions.map((sub) => (
                <div key={sub.id} className="p-4 border border-gray-700 rounded-lg bg-gray-750">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-gray-400">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </div>
                    <Badge className={`${getStatusColor(sub.status)} text-white`}>
                      {sub.status}
                    </Badge>
                  </div>
                  <div className="bg-gray-700 p-3 rounded text-gray-200">
                    <p className="text-sm">{sub.prompt_text}</p>
                  </div>
                </div>
              ))}
              
              {userSubmissions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No submissions yet
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {isAdmin && (
        <>
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
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
                className="bg-gray-700 border-gray-600 text-white"
              />
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">
                Pending Recommendations ({recommendations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="p-4 border border-gray-700 rounded-lg bg-gray-750">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-white">{rec.username}</div>
                          <div className="text-sm text-gray-400">
                            {new Date(rec.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge className="bg-yellow-600 text-white">{rec.status}</Badge>
                      </div>
                      
                      <div className="bg-gray-700 p-3 rounded mb-3">
                        <p className="text-sm text-gray-200">{rec.prompt_text}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => approveAndSchedule(rec)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Approve & Schedule
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => rejectRecommendation(rec.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {recommendations.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
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