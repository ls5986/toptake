import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Calendar, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import CalendarGrid from './CalendarGrid';

interface DailyPrompt {
  id: string;
  prompt_text: string;
  category?: string;
  prompt_date: string;
  is_active: boolean;
  created_at: string;
  source?: string;
}

interface CalendarDay {
  date: Date;
  prompt?: DailyPrompt;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
}

const PromptCalendar: React.FC = () => {
  const [dailyPrompts, setDailyPrompts] = useState<DailyPrompt[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState<DailyPrompt | null>(null);
  const [editText, setEditText] = useState('');
  const [newPromptDate, setNewPromptDate] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { isAdmin } = useAppContext();
  const { toast } = useToast();

  useEffect(() => {
    loadMonthlyPrompts();
  }, [currentMonth]);

  const loadMonthlyPrompts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      
      const result = await supabase
        .from('daily_prompts')
        .select()
        .eq('is_active', true)
        .eq('prompt_date', `%${year}-${month + 1}%`)
        .order('prompt_date', { ascending: true });
      
      if (result.data) {
        setDailyPrompts(result.data);
        console.log(`Loaded ${result.data.length} prompts for ${year}-${month + 1}`);
      } else {
        setError('No prompts found');
        console.error('Failed to load monthly prompts');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load calendar data';
      setError(errorMsg);
      console.error('Error loading monthly prompts:', err);
      toast({ 
        title: 'Error loading calendar', 
        description: errorMsg,
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const prompt = dailyPrompts.find(p => p.prompt_date === dateStr);
      
      days.push({
        date,
        prompt,
        isToday: date.getTime() === today.getTime(),
        isPast: date < today,
        isCurrentMonth: date.getMonth() === month
      });
    }
    
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const handleEditPrompt = (prompt: DailyPrompt) => {
    setEditingPrompt(prompt);
    setEditText(prompt.prompt_text);
  };

  const updatePrompt = async () => {
    if (!editingPrompt || !editText.trim()) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('daily_prompts')
        .update({ prompt_text: editText.trim() })
        .eq('id', editingPrompt.id);
      
      if (error) throw error;
      
      setEditingPrompt(null);
      setEditText('');
      await loadMonthlyPrompts();
      toast({ title: 'Prompt updated successfully' });
    } catch (error: any) {
      console.error('Error updating prompt:', error);
      toast({ 
        title: 'Error updating prompt', 
        description: error.message || 'Failed to update prompt',
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const deletePrompt = async (promptId: string) => {
    if (!confirm('Are you sure you want to delete this prompt?')) return;
    
    try {
      const { error } = await supabase
        .from('daily_prompts')
        .delete()
        .eq('id', promptId);
      
      if (error) throw error;
      
      await loadMonthlyPrompts();
      toast({ title: 'Prompt deleted successfully' });
    } catch (error: any) {
      console.error('Error deleting prompt:', error);
      toast({ 
        title: 'Error deleting prompt', 
        description: error.message || 'Failed to delete prompt',
        variant: 'destructive' 
      });
    }
  };

  const addNewPrompt = async () => {
    if (!newPromptDate || !newPromptText.trim()) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const result = await supabase
        .from('daily_prompts')
        .insert({
          prompt_text: newPromptText.trim(),
          prompt_date: newPromptDate,
          is_active: true,
          created_at: new Date().toISOString()
        });
      
      if (result.error) throw result.error;
      
      setNewPromptDate('');
      setNewPromptText('');
      setDialogOpen(false);
      await loadMonthlyPrompts();
      toast({ title: 'Success', description: 'Prompt added successfully' });
    } catch (error: any) {
      console.error('Error adding prompt:', error);
      toast({ 
        title: 'Error adding prompt', 
        description: error.message || 'Failed to add prompt',
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-2"
                onClick={loadMonthlyPrompts}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const calendarDays = generateCalendarDays();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Prompt Calendar
              <Badge variant="secondary" className="ml-2">
                {dailyPrompts.length} scheduled
              </Badge>
            </CardTitle>
            <div className="flex gap-2 items-center">
              {isAdmin && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Prompt
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Prompt</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Date</label>
                        <Input
                          type="date"
                          value={newPromptDate}
                          onChange={(e) => setNewPromptDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Prompt Text</label>
                        <Textarea
                          value={newPromptText}
                          onChange={(e) => setNewPromptText(e.target.value)}
                          placeholder="Enter prompt text..."
                          rows={3}
                          disabled={submitting}
                        />
                      </div>
                      <Button 
                        onClick={addNewPrompt} 
                        className="w-full"
                        disabled={submitting || !newPromptDate || !newPromptText.trim()}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          'Add Prompt'
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>‹</Button>
              <span className="px-4 py-2 font-medium">
                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
              </span>
              <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>›</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CalendarGrid
            calendarDays={calendarDays}
            isAdmin={isAdmin}
            onEditPrompt={handleEditPrompt}
            onDeletePrompt={deletePrompt}
          />
        </CardContent>
      </Card>

      {/* Edit Prompt Dialog */}
      {editingPrompt && (
        <Dialog open={!!editingPrompt} onOpenChange={() => setEditingPrompt(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Prompt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input value={editingPrompt.prompt_date} disabled />
              </div>
              <div>
                <label className="text-sm font-medium">Prompt Text</label>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                  disabled={submitting}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={updatePrompt} 
                  className="flex-1"
                  disabled={submitting || !editText.trim()}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Prompt'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingPrompt(null)}
                  className="flex-1"
                  disabled={submitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PromptCalendar;