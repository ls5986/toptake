import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface PlannedPrompt {
  day: number;
  type: string;
  content: string;
  reason: string;
  expectedScore: number;
}

interface PromptTypeStats {
  type: string;
  avgEngagement: number;
  count: number;
  lastUsed: string;
}

const PromptPlanner: React.FC = () => {
  const [plannedPrompts, setPlannedPrompts] = useState<PlannedPrompt[]>([]);
  const [typeStats, setTypeStats] = useState<PromptTypeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    generatePromptPlan();
  }, []);

  const generatePromptPlan = async () => {
    try {
      // Get historical data
      const { data: prompts, error } = await supabase
        .from('prompts')
        .select(`
          *,
          takes:takes(count),
          comments:comments(count)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;

      // Calculate type performance
      const typePerformance = new Map<string, { total: number, count: number, lastUsed: string }>();
      
      prompts?.forEach(prompt => {
        const takesCount = prompt.takes?.[0]?.count || 0;
        const commentsCount = prompt.comments?.[0]?.count || 0;
        const engagement = (takesCount * 2) + (commentsCount * 3);
        
        const current = typePerformance.get(prompt.type) || { total: 0, count: 0, lastUsed: prompt.created_at };
        typePerformance.set(prompt.type, {
          total: current.total + engagement,
          count: current.count + 1,
          lastUsed: prompt.created_at > current.lastUsed ? prompt.created_at : current.lastUsed
        });
      });

      // Convert to stats array
      const stats: PromptTypeStats[] = [];
      typePerformance.forEach((data, type) => {
        stats.push({
          type,
          avgEngagement: data.total / data.count,
          count: data.count,
          lastUsed: data.lastUsed
        });
      });
      
      setTypeStats(stats.sort((a, b) => b.avgEngagement - a.avgEngagement));
      
      // Generate 10-day plan
      const plan = generateOptimalPlan(stats);
      setPlannedPrompts(plan);
      
    } catch (error) {
      console.error('Error generating plan:', error);
      toast({ title: 'Error generating plan', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const generateOptimalPlan = (stats: PromptTypeStats[]): PlannedPrompt[] => {
    const plan: PlannedPrompt[] = [];
    const typeRotation = ['controversial', 'personal', 'creative', 'philosophical', 'hypothetical', 'general'];
    
    for (let day = 1; day <= 10; day++) {
      // Determine best type for this day
      let selectedType: string;
      let reason: string;
      let expectedScore: number;
      
      if (day === 1 || day === 7) {
        // Start strong and weekend boost
        const bestType = stats[0] || { type: 'controversial', avgEngagement: 10 };
        selectedType = bestType.type;
        reason = 'High engagement type for strong start/weekend';
        expectedScore = bestType.avgEngagement;
      } else if (day % 3 === 0) {
        // Every 3rd day, use personal prompts
        const personalType = stats.find(s => s.type === 'personal') || { type: 'personal', avgEngagement: 8 };
        selectedType = personalType.type;
        reason = 'Personal connection builds community';
        expectedScore = personalType.avgEngagement;
      } else {
        // Rotate through other types
        const typeIndex = (day - 1) % typeRotation.length;
        selectedType = typeRotation[typeIndex];
        const typeData = stats.find(s => s.type === selectedType) || { type: selectedType, avgEngagement: 6 };
        reason = 'Balanced rotation for variety';
        expectedScore = typeData.avgEngagement;
      }
      
      plan.push({
        day,
        type: selectedType,
        content: generatePromptContent(selectedType, day),
        reason,
        expectedScore
      });
    }
    
    return plan;
  };

  const generatePromptContent = (type: string, day: number): string => {
    const prompts: Record<string, string[]> = {
      controversial: [
        "What's an unpopular opinion you hold strongly?",
        "Which widely accepted practice should be questioned?",
        "What belief do most people have wrong?"
      ],
      personal: [
        "What's a lesson you learned the hard way?",
        "Share a moment that changed your perspective",
        "What's something you're proud of but rarely talk about?"
      ],
      creative: [
        "If you could redesign one thing in the world, what would it be?",
        "Describe your ideal day in exactly 50 words",
        "What would you create if resources were unlimited?"
      ],
      philosophical: [
        "What does success mean to you?",
        "Is it better to be feared or loved?",
        "What's the most important question we should be asking?"
      ],
      hypothetical: [
        "If you could have dinner with anyone, who and why?",
        "What would you do with an extra hour each day?",
        "If you could change one law, what would it be?"
      ],
      general: [
        "What's on your mind today?",
        "Share something that made you smile recently",
        "What's a small change that made a big difference?"
      ]
    };
    
    const typePrompts = prompts[type] || prompts.general;
    return typePrompts[day % typePrompts.length];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>📅 Next 10 Days Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {plannedPrompts.map((prompt) => (
                  <div key={prompt.day} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold">Day {prompt.day}</span>
                      <Badge variant={prompt.expectedScore > 10 ? 'default' : 'secondary'}>
                        {prompt.type}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2 font-medium">{prompt.content}</p>
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{prompt.reason}</span>
                      <span>Expected: {prompt.expectedScore.toFixed(1)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📊 Type Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-3">
                {typeStats.map((stat) => (
                  <div key={stat.type} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium capitalize">{stat.type}</span>
                      <Badge variant={stat.avgEngagement > 10 ? 'default' : 'outline'}>
                        {stat.avgEngagement.toFixed(1)}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{stat.count} prompts</span>
                      <span>Last: {new Date(stat.lastUsed).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🎯 Strategy Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="font-bold text-blue-800">Best Performing</div>
              <div className="text-sm text-blue-600">
                {typeStats[0]?.type || 'N/A'} ({typeStats[0]?.avgEngagement.toFixed(1) || '0'} avg)
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="font-bold text-yellow-800">Needs Attention</div>
              <div className="text-sm text-yellow-600">
                {typeStats[typeStats.length - 1]?.type || 'N/A'}
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="font-bold text-green-800">Total Planned Score</div>
              <div className="text-sm text-green-600">
                {plannedPrompts.reduce((sum, p) => sum + p.expectedScore, 0).toFixed(1)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptPlanner;