import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Plus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';

interface ScheduledPrompt {
  id: string;
  prompt: string;
  prompt_text: string;
  prompt_date: string;
  is_active: boolean;
  source?: string;
}

const PromptScheduler: React.FC = () => {
  const [prompts, setPrompts] = useState<ScheduledPrompt[]>([]);
  const [newPrompt, setNewPrompt] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('*')
        .gte('prompt_date', today)
        .order('prompt_date', { ascending: true });
      if (error) throw error;
      setPrompts(data || []);
      console.log(`Loaded ${data?.length || 0} scheduled prompts`);
    } catch (error: any) {
      console.error('Error loading prompts:', error);
      toast({
        title: 'Error Loading Prompts',
        description: error.message || 'Failed to load scheduled prompts',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const addPrompt = async () => {
    if (!newPrompt.trim() || !selectedDate) {
      toast({ 
        title: 'Missing Information', 
        description: 'Please enter prompt text and select a date',
        variant: 'destructive' 
      });
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setLastResult(null);
    try {
      const { error } = await supabase
        .from('daily_prompts')
        .insert({
          prompt_text: newPrompt.trim(),
          prompt_date: selectedDate,
          is_active: true,
          created_at: new Date().toISOString(),
          source: 'admin_created'
        });
      if (error) throw error;
      setNewPrompt('');
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setSelectedDate(nextDay.toISOString().split('T')[0]);
      await loadPrompts();
      setLastResult({ success: true, message: 'Prompt scheduled successfully' });
      toast({ title: 'Success', description: 'Prompt scheduled successfully', variant: 'default' });
    } catch (error: any) {
      const errorMessage = error.code === '23505' 
        ? `A prompt is already scheduled for ${selectedDate}. Please choose a different date.`
        : error.message || 'An unexpected error occurred while scheduling the prompt';
      setLastResult({ success: false, message: errorMessage });
      toast({ title: 'Error Scheduling Prompt', description: errorMessage, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading schedule...</p>
        </div>
      </div>
    );
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
          {lastResult && (
            <Alert variant={lastResult.success ? "default" : "destructive"}>
              {lastResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>{lastResult.message}</AlertDescription>
            </Alert>
          )}
          
          <Textarea
            placeholder="Enter prompt text..."
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            rows={3}
            maxLength={500}
            disabled={submitting}
            className={submitting ? 'opacity-50' : ''}
          />
          
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              disabled={submitting}
              className={submitting ? 'opacity-50' : ''}
            />
          </div>
          
          <Button 
            onClick={addPrompt} 
            className="w-full" 
            disabled={submitting || !newPrompt.trim() || !selectedDate}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              'Schedule Prompt'
            )}
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
                      {new Date(prompt.prompt_date).toLocaleDateString()}
                    </div>
                    <Badge variant={prompt.is_active ? "default" : "secondary"}>
                      {prompt.is_active ? "Active" : "Scheduled"}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    {prompt.prompt_text}
                  </div>
                  {prompt.source && (
                    <Badge variant="outline" className="text-xs">
                      {prompt.source}
                    </Badge>
                  )}
                </div>
              ))}
              
              {prompts.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No prompts scheduled</p>
                  <p className="text-xs">Add your first prompt to get started</p>
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