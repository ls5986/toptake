import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Wand2, Sparkles, Download } from 'lucide-react';

interface RorkPrompt {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  tags: string[];
}

const RorkIntegration: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const rorkPrompts: RorkPrompt[] = [
    {
      id: '1',
      title: 'Social Media Manager App',
      description: 'Create an iOS app that helps users schedule and manage their social media posts across multiple platforms with AI-powered content suggestions.',
      category: 'Social',
      difficulty: 'Intermediate',
      estimatedTime: '2-3 hours',
      tags: ['Social Media', 'Scheduling', 'AI Content']
    },
    {
      id: '2', 
      title: 'Personal Finance Tracker',
      description: 'Build a comprehensive expense tracking app with budget planning, bill reminders, and investment portfolio tracking features.',
      category: 'Finance',
      difficulty: 'Advanced',
      estimatedTime: '3-4 hours',
      tags: ['Finance', 'Budgeting', 'Analytics']
    },
    {
      id: '3',
      title: 'Habit Building Companion',
      description: 'Design a motivational app that helps users build positive habits with streak tracking, rewards system, and community challenges.',
      category: 'Productivity',
      difficulty: 'Beginner',
      estimatedTime: '1-2 hours', 
      tags: ['Habits', 'Motivation', 'Gamification']
    }
  ];

  const categories = ['all', 'Social', 'Finance', 'Productivity', 'Health', 'Education'];

  const filteredPrompts = selectedCategory === 'all' 
    ? rorkPrompts 
    : rorkPrompts.filter(p => p.category === selectedCategory);

  const generateCustomPrompt = async () => {
    if (!customPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const response = await fetch(
        'https://qajtxngbrujlopzqjvfj.supabase.co/functions/v1/74ad3069-8805-49cf-8285-9b2b9b1ec10f',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            topic: customPrompt,
            type: 'rork_app_idea'
          })
        }
      );
      const data = await response.json();
      // Handle generated prompt
    } catch (error) {
      console.error('Error generating prompt:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Smartphone className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Rork AI App Creator</h1>
          <Sparkles className="h-8 w-8 text-purple-600" />
        </div>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Generate creative iOS app ideas and prompts for Rork, the AI-powered app development platform. 
          Perfect for TopTake community challenges and creative inspiration.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Featured App Prompts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat)}
                    className="capitalize"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
              
              <div className="space-y-4">
                {filteredPrompts.map(prompt => (
                  <Card key={prompt.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{prompt.title}</h3>
                        <Badge variant={prompt.difficulty === 'Beginner' ? 'secondary' : 
                                     prompt.difficulty === 'Intermediate' ? 'default' : 'destructive'}>
                          {prompt.difficulty}
                        </Badge>
                      </div>
                      <p className="text-gray-600 mb-3">{prompt.description}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {prompt.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>Est. Time: {prompt.estimatedTime}</span>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4 mr-1" />
                          Use Prompt
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Prompt Generator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe your app idea or concept..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={4}
              />
              <Button 
                onClick={generateCustomPrompt}
                disabled={isGenerating || !customPrompt.trim()}
                className="w-full"
              >
                {isGenerating ? 'Generating...' : 'Generate AI Prompt'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rork Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                These prompts are optimized for Rork's AI app creation capabilities:
              </p>
              <ul className="text-sm space-y-1 text-gray-600">
                <li>• iOS-focused development</li>
                <li>• AI-assisted coding</li>
                <li>• Rapid prototyping</li>
                <li>• Modern UI/UX patterns</li>
              </ul>
              <Button variant="outline" className="w-full">
                Open in Rork
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RorkIntegration;