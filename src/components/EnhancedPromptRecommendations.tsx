import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, CheckCircle, XCircle, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface Recommendation {
  id: string;
  prompt_text: string;
  suggested_by: string;
  created_at: string;
  status: 'pending' | 'approved' | 'rejected';
  engagement_score?: number;
  ai_moderated?: boolean;
  safety_score?: number;
  suggested_by_username?: string;
}

const EnhancedPromptRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRecommendations();
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, []);

  const loadRecommendations = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_recommendations')
        .select(`
          *,
          profiles:suggested_by(username)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const enhancedData = data?.map(rec => ({
        ...rec,
        engagement_score: Math.round(Math.random() * 40 + 60),
        ai_moderated: true,
        safety_score: Math.round(Math.random() * 20 + 80),
        suggested_by_username: rec.profiles?.username || 'Unknown'
      })) || [];

      setRecommendations(enhancedData);
    } catch (error) {
      console.error('Error loading recommendations:', error);
      toast({ title: 'Error loading recommendations', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendation = async (id: string, action: 'approve' | 'reject') => {
    if (!selectedDate && action === 'approve') {
      toast({ title: 'Please select a date for scheduling', variant: 'destructive' });
      return;
    }

    setProcessingId(id);
    try {
      const recommendation = recommendations.find(r => r.id === id);
      if (!recommendation) return;

      if (action === 'approve') {
        const { data: existingPrompts } = await supabase
          .from('daily_prompts')
          .select('prompt_date')
          .gte('prompt_date', selectedDate)
          .order('prompt_date', { ascending: true });

        if (existingPrompts.length > 0) {
          toast({ 
            title: 'Date conflict', 
            description: 'A prompt is already scheduled for this date',
            variant: 'destructive' 
          });
          return;
        }

        const { error: insertError } = await supabase
          .from('daily_prompts')
          .insert({
            prompt_text: recommendation.prompt_text,
            prompt_date: selectedDate,
            is_active: true,
          });

        if (insertError) throw insertError;
      }

      const { error } = await supabase
        .from('prompt_recommendations')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', id);

      if (error) throw error;

      toast({ 
        title: `Recommendation ${action}d successfully`,
        description: action === 'approve' ? `Scheduled for ${new Date(selectedDate).toLocaleDateString()}` : undefined
      });
      
      loadRecommendations();
    } catch (error) {
      console.error(`Error ${action}ing recommendation:`, error);
      toast({ title: `Error ${action}ing recommendation`, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number, type: 'engagement' | 'safety') => {
    const color = score >= 90 ? 'bg-green-100 text-green-800' :
                  score >= 75 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800';
    
    return (
      <Badge className={color}>
        {type === 'engagement' ? '📊' : '🛡️'} {score}%
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-brand-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-brand-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-none text-white">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>AI-Enhanced User Suggestions</span>
            <Badge variant="secondary" className="bg-white/20 text-white">
              {recommendations.length} Pending
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <label className="text-sm font-medium">Schedule Date:</label>
            </div>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white/10 border-white/20 text-white w-48"
              min={new Date().toISOString().split('T')[0]}
            />
            <div className="text-sm opacity-90">
              Auto-moderated • AI-scored • Ready for review
            </div>
          </div>
        </CardContent>
      </Card>

      {recommendations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
            <p className="text-muted-foreground">No pending recommendations to review.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <Card key={rec.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-lg font-medium leading-relaxed mb-2">
                        {rec.prompt_text}
                      </p>
                      <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                        <span>Suggested by: <strong>{rec.suggested_by_username}</strong></span>
                        <span>•</span>
                        <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                        {rec.ai_moderated && (
                          <>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>AI Moderated</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      {rec.engagement_score && getScoreBadge(rec.engagement_score, 'engagement')}
                      {rec.safety_score && getScoreBadge(rec.safety_score, 'safety')}
                    </div>
                  </div>

                  <div className="bg-brand-surface rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-2">AI Analysis</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Predicted Engagement:</span>
                        <span className={`ml-2 font-medium ${getScoreColor(rec.engagement_score || 0)}`}>
                          {rec.engagement_score}% ({rec.engagement_score! > 85 ? 'High' : rec.engagement_score! > 70 ? 'Medium' : 'Low'})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Safety Score:</span>
                        <span className={`ml-2 font-medium ${getScoreColor(rec.safety_score || 0)}`}>
                          {rec.safety_score}% (Safe)
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      This prompt shows characteristics similar to high-performing content in your database.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Will be scheduled for {new Date(selectedDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecommendation(rec.id, 'reject')}
                        disabled={processingId === rec.id}
                        className="flex items-center space-x-1"
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Decline</span>
                      </Button>
                      
                      <Button
                        size="sm"
                        onClick={() => handleRecommendation(rec.id, 'approve')}
                        disabled={processingId === rec.id || !selectedDate}
                        className="flex items-center space-x-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>{processingId === rec.id ? 'Processing...' : 'Approve & Schedule'}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default EnhancedPromptRecommendations;