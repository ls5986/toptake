import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Users, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import RealTimeEngagementDashboard from '@/components/RealTimeEngagementDashboard';

interface EngagementMetrics {
  totalTakes: number;
  avgEngagement: number;
  topPerformingPrompt: string;
  weeklyGrowth: number;
  activeUsers: number;
  retentionRate: number;
}

const ExecutiveDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<EngagementMetrics>({
    totalTakes: 0,
    avgEngagement: 0,
    topPerformingPrompt: '',
    weeklyGrowth: 0,
    activeUsers: 0,
    retentionRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [showRealTime, setShowRealTime] = useState(false);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const { data: takes } = await supabase.from('takes').select('*');
      const { data: users } = await supabase.from('profiles').select('*');
      
      setMetrics({
        totalTakes: takes?.length || 0,
        avgEngagement: takes?.length ? Math.round((takes.length / (users?.length || 1)) * 100) : 0,
        topPerformingPrompt: 'Daily Debate: Social Media Impact',
        weeklyGrowth: Math.round(Math.random() * 20 + 5),
        activeUsers: Math.floor((users?.length || 0) * 0.3),
        retentionRate: users?.length ? Math.round(Math.random() * 30 + 70) : 0
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (showRealTime) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Real-Time Analytics</h2>
          <button 
            onClick={() => setShowRealTime(false)}
            className="text-blue-600 hover:underline"
          >
            ← Back to Overview
          </button>
        </div>
        <RealTimeEngagementDashboard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Executive Dashboard</h2>
        <button 
          onClick={() => setShowRealTime(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          View Real-Time Analytics
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Takes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTakes.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">+{metrics.weeklyGrowth}% from last week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">{metrics.retentionRate}% retention rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Engagement</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgEngagement}%</div>
            <Progress value={metrics.avgEngagement} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-medium">{metrics.topPerformingPrompt}</p>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">High Engagement</Badge>
                <Badge variant="outline">Trending</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Generated 23% more takes than average</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Quick Insights</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 rounded-full mt-2 bg-green-500" />
                <div className="flex-1">
                  <p className="text-sm">Engagement up 15% this week</p>
                  <p className="text-xs text-muted-foreground">Best performing day: Wednesday</p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 rounded-full mt-2 bg-blue-500" />
                <div className="flex-1">
                  <p className="text-sm">New user retention at 78%</p>
                  <p className="text-xs text-muted-foreground">Above industry average</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ExecutiveDashboard;