import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Calendar, Edit, Trash2, Plus } from 'lucide-react';

interface DailyPrompt {
  id: string;
  prompt_text: string;
  category?: string;
  scheduled_for: string;
  is_active: boolean;
  created_at: string;
}

interface CalendarDay {
  date: Date;
  prompt?: DailyPrompt;
  isToday: boolean;
  isPast: boolean;
}

const PromptCalendar: React.FC = () => {
  const [dailyPrompts, setDailyPrompts] = useState<DailyPrompt[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [editingPrompt, setEditingPrompt] = useState<DailyPrompt | null>(null);
  const [editText, setEditText] = useState('');
  const [newPromptDate, setNewPromptDate] = useState('');
  const [newPromptText, setNewPromptText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isAdmin } = useAppContext();
  const { toast } = useToast();

  useEffect(() => {
    loadDailyPrompts();
  }, [currentMonth]);

  const loadDailyPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('*')
        .order('scheduled_for', { ascending: true });
      
      if (error) throw error;
      setDailyPrompts(data || []);
    } catch (error) {
      console.error('Error loading daily prompts:', error);
      toast({ title: 'Error loading calendar', variant: 'destructive' });
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
      const prompt = dailyPrompts.find(p => p.scheduled_for === dateStr);
      
      days.push({
        date,
        prompt,
        isToday: date.getTime() === today.getTime(),
        isPast: date < today
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

  const updatePrompt = async () => {
    if (!editingPrompt || !editText.trim()) return;
    
    try {
      const { error } = await supabase
        .from('daily_prompts')
        .update({ prompt_text: editText.trim() })
        .eq('id', editingPrompt.id);
      
      if (error) throw error;
      
      setEditingPrompt(null);
      setEditText('');
      loadDailyPrompts();
      toast({ title: 'Prompt updated successfully' });
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast({ title: 'Error updating prompt', variant: 'destructive' });
    }
  };

  const deletePrompt = async (promptId: string) => {
    try {
      const { error } = await supabase
        .from('daily_prompts')
        .delete()
        .eq('id', promptId);
      
      if (error) throw error;
      
      loadDailyPrompts();
      toast({ title: 'Prompt deleted successfully' });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({ title: 'Error deleting prompt', variant: 'destructive' });
    }
  };

  const addNewPrompt = async () => {
    if (!newPromptDate || !newPromptText.trim()) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    try {
      const { data: existing } = await supabase
        .from('daily_prompts')
        .select('id')
        .eq('scheduled_for', newPromptDate)
        .single();

      if (existing) {
        toast({ title: 'Date already has a scheduled prompt', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('daily_prompts')
        .insert({
          prompt_text: newPromptText.trim(),
          scheduled_for: newPromptDate,
          is_active: false,
          category: 'custom'
        });
      
      if (error) throw error;
      
      setNewPromptDate('');
      setNewPromptText('');
      setDialogOpen(false);
      loadDailyPrompts();
      toast({ title: 'Prompt added successfully' });
    } catch (error) {
      console.error('Error adding prompt:', error);
      toast({ title: 'Error adding prompt', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  const calendarDays = generateCalendarDays();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Prompt Calendar
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
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Prompt Text</label>
                        <Textarea
                          value={newPromptText}
                          onChange={(e) => setNewPromptText(e.target.value)}
                          placeholder="Enter prompt text..."
                          rows={3}
                        />
                      </div>
                      <Button onClick={addNewPrompt} className="w-full">
                        Add Prompt
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
          <div className="grid grid-cols-7 gap-1 mb-4">
            {dayNames.map(day => (
              <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`
                  p-2 min-h-[100px] border rounded-lg relative group
                  ${day.isToday ? 'bg-blue-50 border-blue-200' : ''}
                  ${day.isPast ? 'bg-gray-50' : ''}
                  ${day.prompt ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}
                  ${day.date.getMonth() !== currentMonth.getMonth() ? 'opacity-50' : ''}
                `}
              >
                <div className="text-sm font-medium mb-1">
                  {day.date.getDate()}
                </div>
                {day.prompt ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={day.prompt.is_active ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {day.prompt.category || 'prompt'}
                      </Badge>
                      {isAdmin && (
                        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => {
                              setEditingPrompt(day.prompt!);
                              setEditText(day.prompt!.prompt_text);
                            }}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600"
                            onClick={() => deletePrompt(day.prompt!.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 line-clamp-3">
                      {day.prompt.prompt_text.length > 60 
                        ? `${day.prompt.prompt_text.substring(0, 60)}...`
                        : day.prompt.prompt_text
                      }
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">No prompt</div>
                )}
              </div>
            ))}
          </div>
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
                <Input value={editingPrompt.scheduled_for} disabled />
              </div>
              <div>
                <label className="text-sm font-medium">Prompt Text</label>
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={updatePrompt} className="flex-1">
                  Update Prompt
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingPrompt(null)}
                  className="flex-1"
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