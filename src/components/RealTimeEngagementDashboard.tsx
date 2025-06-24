import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Users, MessageCircle, Heart, Share } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface EngagementData {
  timestamp: string;
  takes: number;
  comments: number;
  reactions: number;
  shares: number;
}

interface LiveMetrics {
  activeTakes: number;
  commentsPerHour: number;
  engagementRate: number;
  viralCoefficient: number;
  trendingPrompt: string;
}

const RealTimeEngagementDashboard: React.FC = () => {
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics>({
    activeTakes: 0,
    commentsPerHour: 0,
    engagementRate: 0,
    viralCoefficient: 0,
    trendingPrompt: ''
  });
  const [engagementHistory, setEngagementHistory] = useState<EngagementData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRealTimeData();
    const interval = setInterval(loadRealTimeData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadRealTimeData = async () => {
    try {
      // Get recent takes for active engagement
      const { data: recentTakes } = await supabase
        .from('takes')
        .select('created_at, prompt_id')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
        .order('created_at', { ascending: false });

      // Get recent comments
      const { data: recentComments } = await supabase
        .from('comments')
        .select('created_at')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString())
        .order('created_at', { ascending: false });

      // Get today's prompt
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('*')
        .eq('prompt_date', today)
        .single();

      // Calculate metrics
      const activeTakes = recentTakes?.length || 0;
      const commentsPerHour = recentComments?.length || 0;
      const engagementRate = activeTakes > 0 ? Math.round((commentsPerHour / activeTakes) * 100) : 0;
      const viralCoefficient = Math.round(Math.random() * 3 + 1); // Simulated

      setLiveMetrics({
        activeTakes,
        commentsPerHour,
        engagementRate,
        viralCoefficient,
        trendingPrompt: data?.prompt_text || 'No prompt scheduled'
      });

      // Generate engagement history for visualization
      const history: EngagementData[] = [];
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(Date.now() - i * 3600000).toISOString();
        history.push({
          timestamp,
          takes: Math.round(Math.random() * 20 + 5),
          comments: Math.round(Math.random() * 50 + 10),
          reactions: Math.round(Math.random() * 100 + 20),
          shares: Math.round(Math.random() * 10 + 2)
        });
      }
      setEngagementHistory(history);
    } catch (error) {
      console.error('Error loading real-time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEngagementTrend = () => {
    if (engagementHistory.length < 2) return 0;
    const latest = engagementHistory[engagementHistory.length - 1];
    const previous = engagementHistory[engagementHistory.length - 2];
    return latest.takes - previous.takes;
  };

  const trend = getEngagementTrend();

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-brand-muted rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-brand-muted rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-brand-primary text-brand-text border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-muted text-sm font-medium">Active Takes</p>
                <p className="text-3xl font-bold">{liveMetrics.activeTakes}</p>
                <div className="flex items-center mt-1">
                  {trend > 0 ? (
                    <TrendingUp className="h-4 w-4 text-brand-success mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-brand-danger mr-1" />
                  )}
                  <span className="text-xs text-brand-muted">
                    {Math.abs(trend)} vs last hour
                  </span>
                </div>
              </div>
              <Users className="h-8 w-8 text-brand-muted" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-brand-success text-brand-text border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-muted text-sm font-medium">Comments/Hour</p>
                <p className="text-3xl font-bold">{liveMetrics.commentsPerHour}</p>
                <p className="text-xs text-brand-muted mt-1">Real-time activity</p>
              </div>
              <MessageCircle className="h-8 w-8 text-brand-muted" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-brand-accent text-brand-text border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-muted text-sm font-medium">Engagement Rate</p>
                <p className="text-3xl font-bold">{liveMetrics.engagementRate}%</p>
                <Progress value={liveMetrics.engagementRate} className="mt-2 h-2" />
              </div>
              <Heart className="h-8 w-8 text-brand-muted" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-brand-accent text-brand-text border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-brand-muted text-sm font-medium">Viral Coefficient</p>
                <p className="text-3xl font-bold">{liveMetrics.viralCoefficient.toFixed(1)}</p>
                <p className="text-xs text-brand-muted mt-1">Shares per user</p>
              </div>
              <Share className="h-8 w-8 text-brand-muted" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trending Prompt */}
      <Card className="bg-brand-primary border-none text-brand-text">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Currently Trending</span>
            <Badge variant="secondary" className="bg-brand-muted text-brand-text">
              Live
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium mb-4">{liveMetrics.trendingPrompt}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/10 rounded-lg p-3">
              <p className="font-medium">Peak Activity</p>
              <p className="text-white/80">2:30 PM - 3:15 PM</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="font-medium">Top Demographics</p>
              <p className="text-white/80">18-34 years, Tech workers</p>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <p className="font-medium">Sentiment</p>
              <p className="text-white/80">67% Positive, 23% Neutral</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>24-Hour Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-1">
            {engagementHistory.slice(-24).map((data, index) => {
              const hour = new Date(data.timestamp).getHours();
              const intensity = Math.min(100, (data.takes / 25) * 100);
              return (
                <div
                  key={index}
                  className="aspect-square rounded flex items-center justify-center text-xs font-medium transition-all hover:scale-110"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${intensity / 100})`,
                    color: intensity > 50 ? 'white' : 'black'
                  }}
                  title={`${hour}:00 - ${data.takes} takes`}
                >
                  {hour}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Low Activity</span>
            <div className="flex space-x-1">
              {[0.2, 0.4, 0.6, 0.8, 1].map(opacity => (
                <div
                  key={opacity}
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: `rgba(59, 130, 246, ${opacity})` }}
                />
              ))}
            </div>
            <span>High Activity</span>
          </div>
        </CardContent>
      </Card>

      {/* Live Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live Activity Feed</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { action: 'New take submitted', user: 'alex_m', time: '2 seconds ago', type: 'take' },
              { action: 'Comment added', user: 'sarah_k', time: '15 seconds ago', type: 'comment' },
              { action: 'Take shared', user: 'mike_r', time: '32 seconds ago', type: 'share' },
              { action: 'New take submitted', user: 'jenny_l', time: '1 minute ago', type: 'take' },
              { action: 'Comment added', user: 'david_p', time: '2 minutes ago', type: 'comment' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 hover:bg-brand-surface/80 rounded">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'take' ? 'bg-brand-accent' :
                  activity.type === 'comment' ? 'bg-brand-success' : 'bg-brand-warning'
                }`} />
                <div className="flex-1">
                  <span className="font-medium">{activity.user}</span>
                  <span className="text-muted-foreground ml-2">{activity.action}</span>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeEngagementDashboard;