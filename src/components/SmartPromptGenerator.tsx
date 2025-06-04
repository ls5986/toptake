import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, TrendingUp, Target, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface GeneratedPrompt {
  text: string;
  category: string;
  engagementScore: number;
  controversyLevel: 'Low' | 'Medium' | 'High';
  reasoning: string;
}

const SmartPromptGenerator: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [generatedPrompts, setGeneratedPrompts] = useState<GeneratedPrompt[]>([]);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const categories = [
    'Technology & AI',
    'Social Issues',
    'Personal Growth',
    'Relationships',
    'Career & Work',
    'Health & Wellness',
    'Entertainment',
    'Politics & Society',
    'Environment',
    'Education'
  ];

  const generatePrompts = async () => {
    if (!selectedCategory && !customTopic) {
      toast({ title: 'Please select a category or enter a custom topic', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const mockPrompts: GeneratedPrompt[] = [
        {
          text: `${customTopic || selectedCategory}: What's the most controversial opinion you hold that you're willing to defend?`,
          category: selectedCategory || 'Custom',
          engagementScore: 94,
          controversyLevel: 'High',
          reasoning: 'Opinion-based prompts generate 67% more comments and debates'
        },
        {
          text: `If you could change one thing about ${customTopic || selectedCategory.toLowerCase()} that would impact everyone, what would it be?`,
          category: selectedCategory || 'Custom',
          engagementScore: 87,
          controversyLevel: 'Medium',
          reasoning: 'Hypothetical scenarios increase user engagement by 45%'
        }
      ];

      setGeneratedPrompts(mockPrompts);
      toast({ title: 'Prompts generated successfully!' });
    } catch (error) {
      console.error('Error generating prompts:', error);
      toast({ title: 'Error generating prompts', variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const schedulePrompt = async (prompt: GeneratedPrompt) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { data: existingPrompts } = await supabase
        .from('daily_prompts')
        .select('prompt_date')
        .gte('prompt_date', tomorrow.toISOString().split('T')[0])
        .order('prompt_date', { ascending: true });

      let scheduleDate = new Date(tomorrow);
      const existingDates = existingPrompts?.map(p => p.prompt_date) || [];
      
      while (existingDates.includes(scheduleDate.toISOString().split('T')[0])) {
        scheduleDate.setDate(scheduleDate.getDate() + 1);
      }

      const { error } = await supabase
        .from('daily_prompts')
        .insert({
          prompt_text: prompt.text,
          prompt_date: scheduleDate.toISOString().split('T')[0],
          is_active: false,
          source: 'ai_generator'
        });

      if (error) throw error;

      toast({ 
        title: 'Prompt scheduled successfully!',
        description: `Scheduled for ${scheduleDate.toLocaleDateString()}`
      });
    } catch (error) {
      console.error('Error scheduling prompt:', error);
      toast({ title: `Error scheduling prompt: ${JSON.stringify(error)}`, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <span>AI Prompt Generator</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Topic (Optional)</label>
              <Textarea
                placeholder="Enter a specific topic or trend..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          
          <Button 
            onClick={generatePrompts}
            disabled={generating}
            className="w-full flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Generating...' : 'Generate Smart Prompts'}</span>
          </Button>
        </CardContent>
      </Card>

      {generatedPrompts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Generated Prompts</h3>
          {generatedPrompts.map((prompt, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <p className="text-lg font-medium leading-relaxed">
                    {prompt.text}
                  </p>
                  
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Badge variant="outline">{prompt.category}</Badge>
                    <Button 
                      onClick={() => schedulePrompt(prompt)}
                      size="sm"
                    >
                      Schedule Prompt
                    </Button>
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

export default SmartPromptGenerator;