import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface GeneratedPrompt {
  text: string;
  category: string;
  engagement_score: number;
}

interface BulkPromptGeneratorProps {
  onPromptsGenerated?: (prompts: GeneratedPrompt[]) => void;
}

const categories = [
  'deep', 'controversial', 'lighthearted', 'personal', 
  'hypothetical', 'current_events', 'philosophical', 'creative'
];

export const BulkPromptGenerator: React.FC<BulkPromptGeneratorProps> = ({ onPromptsGenerated }) => {
  const [count, setCount] = useState(5);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [themes, setThemes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPrompts, setGeneratedPrompts] = useState<GeneratedPrompt[]>([]);
  const { toast } = useToast();

  const handleCategoryChange = (category: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, category]);
    } else {
      setSelectedCategories(prev => prev.filter(c => c !== category));
    }
  };

  const generatePrompts = async () => {
    setIsGenerating(true);
    try {
      const request = {
        count,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        themes: themes ? themes.split(',').map(t => t.trim()).filter(Boolean) : undefined
      };

      const response = await fetch(
        'https://qajtxngbrujlopzqjvfj.supabase.co/functions/v1/3b085345-fb02-47fc-8bb0-a3696ddb5d90',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request)
        }
      );

      if (!response.ok) throw new Error('Failed to generate prompts');
      
      const data = await response.json();
      setGeneratedPrompts(data.prompts);
      onPromptsGenerated?.(data.prompts);
      toast({ title: 'Prompts generated successfully!' });
    } catch (error) {
      console.error('Error generating prompts:', error);
      toast({ title: 'Error generating prompts', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const schedulePrompt = async (prompt: GeneratedPrompt) => {
    try {
      const today = new Date();
      const scheduleDate = new Date(today);
      
      const { data: existingPrompts } = await supabase
        .from('daily_prompts')
        .select('prompt_date')
        .gte('prompt_date', scheduleDate.toISOString().split('T')[0])
        .order('prompt_date', { ascending: true });

      const existingDates = existingPrompts?.map(p => p.prompt_date) || [];
      
      while (existingDates.includes(scheduleDate.toISOString().split('T')[0])) {
        scheduleDate.setDate(scheduleDate.getDate() + 1);
      }

      const { error } = await supabase
        .from('daily_prompts')
        .insert({
          prompt_text: prompt.text,
          prompt_date: scheduleDate.toISOString().split('T')[0],
          is_active: true,
          source: 'bulk_generator'
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
          <CardTitle>Bulk Prompt Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="count">Number of Prompts (1-20)</Label>
            <Input
              id="count"
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-32"
            />
          </div>

          <div>
            <Label>Categories (leave empty for all)</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {categories.map(category => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox
                    id={category}
                    checked={selectedCategories.includes(category)}
                    onCheckedChange={(checked) => handleCategoryChange(category, checked as boolean)}
                  />
                  <Label htmlFor={category} className="capitalize">{category.replace('_', ' ')}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="themes">Themes (comma-separated, optional)</Label>
            <Textarea
              id="themes"
              placeholder="e.g., technology, relationships, career"
              value={themes}
              onChange={(e) => setThemes(e.target.value)}
              rows={2}
            />
          </div>

          <Button onClick={generatePrompts} disabled={isGenerating} className="w-full">
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : (
              'Generate Prompts'
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedPrompts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Prompts ({generatedPrompts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {generatedPrompts.map((prompt, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <p className="mb-2">{prompt.text}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {prompt.category.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline">
                        Engagement: {prompt.engagement_score}%
                      </Badge>
                    </div>
                    <Button size="sm" onClick={() => schedulePrompt(prompt)}>
                      Schedule
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};