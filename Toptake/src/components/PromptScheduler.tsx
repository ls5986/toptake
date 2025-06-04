import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ScheduledPrompt {
  id: string;
  prompt: string;
  prompt_text: string;
  scheduled_for: string;
  is_active: boolean;
  source?: string;
}

const PromptScheduler: React.FC = () => {
  const [prompts, setPrompts] = useState<ScheduledPrompt[]>([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const loadPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('*')
        .gte('scheduled_for', new Date().toISOString().split('T')[0])
        .order('scheduled_for', { ascending: true });
      
      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error loading prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPrompt = async () => {
    if (!newPrompt.trim() || !selectedDate) {
      toast({ title: 'Please enter prompt text and select a date', variant: 'destructive' });
      return;
    }
    
    try {
      const existing = prompts.find(p => p.scheduled_for === selectedDate);
      if (existing) {
        toast({ title: 'Date already has a scheduled prompt', variant: 'destructive' });
        return;
      }

      const promptText = newPrompt.trim();
      
      // First, let's check what columns actually exist in the table
      const { data: tableInfo, error: schemaError } = await supabase
        .from('daily_prompts')
        .select('*')
        .limit(1);
      
      if (schemaError) {
        console.error('Schema error:', schemaError);
      }
      
      console.log('Table structure sample:', tableInfo);
      
      // Try minimal insert with only essential fields
      const { data, error } = await supabase
        .from('daily_prompts')
        .insert({
          prompt_text: promptText,
          scheduled_for: selectedDate,
          is_active: false,
          source: 'admin_created'
        })
        .select();
      
      if (error) {
        console.error('Database error details:', error);
        throw error;
      }
      
      console.log('Successfully inserted:', data);
      setNewPrompt('');
      loadPrompts();
      toast({ title: 'Prompt scheduled successfully!' });
    } catch (error: any) {
      console.error('Error adding prompt:', error);
      toast({ 
        title: `Error scheduling prompt: ${error.message || JSON.stringify(error)}`, 
        variant: 'destructive' 
      });
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading schedule...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter prompt text..."
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            rows={3}
            maxLength={500}
          />
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <Button onClick={addPrompt} className="w-full">
            Schedule Prompt
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Prompts ({prompts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {prompts.map((prompt) => (
                <div key={prompt.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-medium">
                      {new Date(prompt.scheduled_for).toLocaleDateString()}
                    </div>
                    <Badge variant={prompt.is_active ? "default" : "secondary"}>
                      {prompt.is_active ? "Active" : "Scheduled"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {prompt.prompt_text || prompt.prompt}
                  </div>
                </div>
              ))}
              
              {prompts.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No prompts scheduled
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptScheduler;