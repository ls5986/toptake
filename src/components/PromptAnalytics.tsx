import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import PromptPlanner from '@/components/PromptPlanner';
import PromptCalendar from '@/components/PromptCalendar';

interface PromptAnalysis {
  id: string;
  content: string;
  type: string;
  engagement_score: number;
  takes_count: number;
  comments_count: number;
  created_at: string;
}

interface RecommendedPrompt {
  type: string;
  reason: string;
  score: number;
  example: string;
}

const PromptAnalytics: React.FC = () => {
  const [prompts, setPrompts] = useState<PromptAnalysis[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedPrompt[]>([]);
  const [onlineToday, setOnlineToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPromptAnalytics();
  }, []);

  const loadPromptAnalytics = async () => {
    try {
      // Get daily prompts
      const { data: promptsData, error: promptsError } = await supabase
        .from('daily_prompts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (promptsError) throw promptsError;
      
      // Get total takes and comments counts
      const { count: totalTakes } = await supabase
        .from('takes')
        .select('*', { count: 'exact', head: true });
      
      const { count: totalComments } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true });
      
      // Get users who have been active today (have takes or comments today)
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const { data: todayTakes } = await supabase
        .from('takes')
        .select('user_id')
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString());
      
      const { data: todayComments } = await supabase
        .from('comments')
        .select('user_id')
        .gte('created_at', todayStart.toISOString())
        .lt('created_at', todayEnd.toISOString());
      
      // Count unique users active today
      const activeUserIds = new Set([
        ...(todayTakes || []).map(t => t.user_id),
        ...(todayComments || []).map(c => c.user_id)
      ]);
      
      setOnlineToday(activeUserIds.size);
      
      // Process prompts with engagement data
      const promptsWithCounts = (promptsData || []).map(prompt => ({
        id: prompt.id,
        content: prompt.prompt,
        type: prompt.category || 'general',
        takes_count: totalTakes || 0,
        comments_count: totalComments || 0,
        engagement_score: calculateEngagementScore(totalTakes || 0, totalComments || 0),
        created_at: prompt.created_at
      }));
      
      setPrompts(promptsWithCounts);
      generateRecommendations(promptsWithCounts);
    } catch (error) {
      console.error('Error loading analytics:', error);
      toast({ title: 'Error loading analytics', description: 'Failed to load prompt analytics', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const calculateEngagementScore = (takes: number, comments: number): number => {
    return (takes * 2) + (comments * 3);
  };

  const generateRecommendations = (promptsData: PromptAnalysis[]) => {
    const typePerformance = new Map<string, { total: number, count: number }>();
    
    promptsData.forEach(prompt => {
      const current = typePerformance.get(prompt.type) || { total: 0, count: 0 };
      typePerformance.set(prompt.type, {
        total: current.total + prompt.engagement_score,
        count: current.count + 1
      });
    });

    const recommendations: RecommendedPrompt[] = [];
    
    typePerformance.forEach((data, type) => {
      const avgScore = data.total / data.count;
      recommendations.push({
        type,
        score: avgScore,
        reason: avgScore > 10 ? 'High engagement' : avgScore > 5 ? 'Moderate engagement' : 'Low engagement',
        example: getExamplePrompt(type)
      });
    });

    setRecommendations(recommendations.sort((a, b) => b.score - a.score));
  };

  const getExamplePrompt = (type: string): string => {
    const examples: Record<string, string> = {
      'controversial': 'What\'s your most unpopular opinion?',
      'personal': 'Share a moment that changed your perspective',
      'hypothetical': 'If you could change one thing about society...',
      'creative': 'Describe your dream world in 3 words',
      'philosophical': 'What does success mean to you?',
      'general': 'What\'s on your mind today?'
    };
    return examples[type] || 'What\'s on your mind today?';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="overview">Analytics</TabsTrigger>
        <TabsTrigger value="calendar">Calendar</TabsTrigger>
        <TabsTrigger value="planner">Planner</TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>📈 Today's Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{onlineToday}</div>
                <div className="text-sm text-gray-600">Active Today</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {prompts.reduce((sum, p) => sum + p.takes_count, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Takes</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {prompts.reduce((sum, p) => sum + p.comments_count, 0)}
                </div>
                <div className="text-sm text-gray-600">Total Comments</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>📊 Recent Prompts</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {prompts.slice(0, 10).map((prompt) => (
                    <div key={prompt.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline">{prompt.type}</Badge>
                        <Badge variant={prompt.engagement_score > 10 ? 'default' : 'secondary'}>
                          Score: {prompt.engagement_score}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {prompt.content.substring(0, 80)}...
                      </p>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>📝 {prompt.takes_count} takes</span>
                        <span>💬 {prompt.comments_count} comments</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🎯 Type Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <div key={rec.type} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium capitalize">{rec.type}</span>
                        <Badge variant={rec.score > 10 ? 'default' : rec.score > 5 ? 'secondary' : 'outline'}>
                          {rec.score.toFixed(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{rec.reason}</p>
                      <p className="text-xs text-gray-500 italic">"{rec.example}"</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      
      <TabsContent value="calendar">
        <PromptCalendar />
      </TabsContent>
      
      <TabsContent value="planner">
        <PromptPlanner />
      </TabsContent>
    </Tabs>
  );
};

export default PromptAnalytics;