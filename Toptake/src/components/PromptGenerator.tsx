import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Calendar, CheckCircle } from 'lucide-react';

const PromptGenerator: React.FC = () => {
  const [generating, setGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const { toast } = useToast();

  // Set tomorrow as default date
  React.useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setScheduleDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const generateTomorrowPrompt = async () => {
    setGenerating(true);
    try {
      // Call the generate-daily-prompt function
      const response = await fetch(
        'https://qajtxngbrujlopzqjvfj.supabase.co/functions/v1/da143b5a-61c1-4c28-b715-e018c5fb1ccd',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: 'general',
            tone: 'engaging'
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate prompt');
      }

      const data = await response.json();
      
      if (data.prompt) {
        setGeneratedPrompt(data.prompt);
        toast({ 
          title: 'Prompt Generated!', 
          description: 'AI has created a new prompt for you.' 
        });
      } else {
        throw new Error('No prompt returned from AI');
      }
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast({ 
        title: 'Generation Failed', 
        description: 'Could not generate prompt. Try again later.',
        variant: 'destructive' 
      });
      
      // Fallback to a default prompt
      const fallbackPrompts = [
        "What's a small decision you made today that ended up having a bigger impact than expected?",
        "If you could give your past self one piece of advice, what would it be and why?",
        "What's something you've learned recently that changed your perspective?",
        "Describe a moment when you felt truly proud of yourself.",
        "What's a skill you wish you had, and what's stopping you from learning it?"
      ];
      
      const randomPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
      setGeneratedPrompt(randomPrompt);
      toast({ 
        title: 'Fallback Prompt Generated', 
        description: 'Using a curated prompt instead.' 
      });
    } finally {
      setGenerating(false);
    }
  };

  const schedulePrompt = async (promptText: string) => {
    if (!scheduleDate || !promptText.trim()) {
      toast({ title: 'Please select a date and ensure prompt text exists', variant: 'destructive' });
      return;
    }

    setScheduling(true);
    try {
      // Check if date already has a prompt
      const { data: existing } = await supabase
        .from('daily_prompts')
        .select('id')
        .eq('scheduled_for', scheduleDate)
        .single();

      if (existing) {
        toast({ title: 'Date already has a scheduled prompt', variant: 'destructive' });
        return;
      }

      // Insert the new prompt
      const { error } = await supabase
        .from('daily_prompts')
        .insert({
          prompt_text: promptText.trim(),
          scheduled_for: scheduleDate,
          is_active: false,
          category: 'ai_generated',
          source: 'admin_generated'
        });
      
      if (error) throw error;
      
      toast({ 
        title: 'Prompt Scheduled!', 
        description: `Prompt scheduled for ${scheduleDate}` 
      });
      
      // Clear the form
      setGeneratedPrompt('');
      setCustomPrompt('');
      
      // Set next day as default
      const nextDay = new Date(scheduleDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setScheduleDate(nextDay.toISOString().split('T')[0]);
      
    } catch (error) {
      console.error('Error scheduling prompt:', error);
      toast({ title: 'Error scheduling prompt', variant: 'destructive' });
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* AI Generation Section */}
      <Card className="bg-gradient-to-r from-purple-600 to-blue-600 border-none text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5" />
            AI Prompt Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-purple-100">
            Generate engaging prompts using AI to keep your community active and thoughtful.
          </p>
          <Button 
            onClick={generateTomorrowPrompt}
            disabled={generating}
            className="bg-white text-purple-600 hover:bg-gray-100"
            size="lg"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate New Prompt
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated/Custom Prompt Display */}
      {(generatedPrompt || customPrompt) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Ready to Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg border-l-4 border-purple-500">
              <p className="text-gray-800 font-medium">
                {generatedPrompt || customPrompt}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Schedule for Date:
                </label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="max-w-xs"
                />
              </div>
              
              <Button 
                onClick={() => schedulePrompt(generatedPrompt || customPrompt)}
                disabled={scheduling || !scheduleDate}
                className="bg-green-600 hover:bg-green-700 mt-6"
              >
                {scheduling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Prompt
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Prompt Creation */}
      <Card>
        <CardHeader>
          <CardTitle>Create Custom Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Write your own prompt:
            </label>
            <Textarea
              placeholder="Enter your custom prompt here..."
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>
          
          {customPrompt.trim() && (
            <Badge variant="secondary" className="mt-2">
              {customPrompt.length} characters
            </Badge>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Prompt Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-1">Engaging Questions</h4>
              <p className="text-blue-600">Ask about personal experiences, opinions, or hypothetical scenarios</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-1">Clear & Concise</h4>
              <p className="text-green-600">Keep prompts under 200 characters for better engagement</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-1">Relatable Topics</h4>
              <p className="text-purple-600">Focus on universal experiences everyone can connect with</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <h4 className="font-medium text-orange-800 mb-1">Open-Ended</h4>
              <p className="text-orange-600">Avoid yes/no questions - encourage detailed responses</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptGenerator;