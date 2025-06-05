import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Copy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GeneratedPrompt {
  title: string;
  description: string;
  features: string[];
  techStack: string[];
  difficulty: string;
  estimatedTime: string;
}

const RorkPromptGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('');
  const [complexity, setComplexity] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState<GeneratedPrompt | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const categories = [
    'Social Media', 'Finance', 'Health & Fitness', 'Productivity', 
    'Entertainment', 'Education', 'Travel', 'Food & Drink', 'Shopping', 'Utilities'
  ];

  const complexityLevels = [
    { value: 'simple', label: 'Simple (1-2 screens)' },
    { value: 'moderate', label: 'Moderate (3-5 screens)' },
    { value: 'complex', label: 'Complex (6+ screens)' }
  ];

  const generatePrompt = async () => {
    if (!topic.trim() || !category || !complexity) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields before generating.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch(
        'https://qajtxngbrujlopzqjvfj.supabase.co/functions/v1/74ad3069-8805-49cf-8285-9b2b9b1ec10f',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            topic,
            category,
            complexity,
            type: 'rork_ios_app'
          })
        }
      );
      
      if (!response.ok) throw new Error('Failed to generate prompt');
      
      const data = await response.json();
      
      // Parse the AI response into structured format
      const prompt: GeneratedPrompt = {
        title: data.title || `${category} App: ${topic}`,
        description: data.description || `Create an innovative ${category.toLowerCase()} app focused on ${topic}`,
        features: data.features || [
          'User authentication and profiles',
          'Core functionality implementation',
          'Modern iOS UI design',
          'Data persistence',
          'Push notifications'
        ],
        techStack: data.techStack || ['SwiftUI', 'Core Data', 'CloudKit', 'Combine'],
        difficulty: complexity === 'simple' ? 'Beginner' : complexity === 'moderate' ? 'Intermediate' : 'Advanced',
        estimatedTime: complexity === 'simple' ? '1-2 hours' : complexity === 'moderate' ? '2-4 hours' : '4-8 hours'
      };
      
      setGeneratedPrompt(prompt);
      toast({
        title: "Prompt Generated!",
        description: "Your Rork app prompt is ready."
      });
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate prompt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPrompt = () => {
    if (!generatedPrompt) return;
    
    const promptText = `# ${generatedPrompt.title}

## Description
${generatedPrompt.description}

## Key Features
${generatedPrompt.features.map(f => `• ${f}`).join('\n')}

## Tech Stack
${generatedPrompt.techStack.join(', ')}

## Difficulty: ${generatedPrompt.difficulty}
## Estimated Time: ${generatedPrompt.estimatedTime}

---
Generated for Rork iOS App Creator`;
    
    navigator.clipboard.writeText(promptText);
    toast({
      title: "Copied!",
      description: "Prompt copied to clipboard."
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rork iOS App Prompt Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">App Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Complexity Level</label>
              <Select value={complexity} onValueChange={setComplexity}>
                <SelectTrigger>
                  <SelectValue placeholder="Select complexity" />
                </SelectTrigger>
                <SelectContent>
                  {complexityLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">App Concept or Feature</label>
            <Textarea
              placeholder="Describe your app idea, main feature, or problem it solves..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
            />
          </div>
          
          <Button 
            onClick={generatePrompt}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" />Generate Rork Prompt</>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedPrompt && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated Prompt</CardTitle>
            <Button onClick={copyPrompt} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">{generatedPrompt.title}</h3>
              <p className="text-brand-muted">{generatedPrompt.description}</p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Key Features:</h4>
              <ul className="space-y-1">
                {generatedPrompt.features.map((feature, index) => (
                  <li key={index} className="text-sm text-brand-muted">• {feature}</li>
                ))}
              </ul>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Difficulty: {generatedPrompt.difficulty}</Badge>
              <Badge variant="outline">Time: {generatedPrompt.estimatedTime}</Badge>
              {generatedPrompt.techStack.map(tech => (
                <Badge key={tech} variant="outline">{tech}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RorkPromptGenerator;