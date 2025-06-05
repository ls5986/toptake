import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay, isSameMonth } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { fixPromptWithAI } from '@/lib/openai';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';

interface Prompt {
  id: string;
  prompt_text: string;
  prompt_date: string;
  status: string;
  engagement: number;
}

const getDayColor = (prompt: Prompt | undefined) => {
  if (!prompt) return 'bg-brand-surface hover:bg-brand-surface border border-dashed border-brand-border';
  if (prompt.engagement >= 10) return 'bg-card-gradient text-brand-text border border-brand-danger';
  if (prompt.engagement >= 3) return 'bg-card-gradient text-brand-text border border-brand-accent';
  return 'bg-brand-surface text-brand-primary border border-brand-border';
};

const Spinner = () => (
  <div className="flex justify-center items-center my-2">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary" />
  </div>
);

const PromptCalendar: React.FC = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalPrompt, setModalPrompt] = useState<Prompt | null>(null);
  const [newPromptText, setNewPromptText] = useState('');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  const days: Date[] = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }
  const { toast } = useToast();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const firstDayStr = format(monthStart, 'yyyy-MM-dd');
      const lastDayStr = format(monthEnd, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('*')
        .gte('prompt_date', firstDayStr)
        .lte('prompt_date', lastDayStr)
        .order('prompt_date', { ascending: true });
      if (error) throw error;
      // Fetch engagement for each prompt
      const promptsWithEngagement = await Promise.all(
        (data || []).map(async (p: Prompt) => {
          // Takes
          const { count: takesCount } = await supabase
            .from('takes')
            .select('id', { count: 'exact', head: true })
            .eq('prompt_date', p.prompt_date);
          // Comments
          const { count: commentsCount } = await supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('prompt_date', p.prompt_date);
          // Reactions
          const { data: takes } = await supabase
            .from('takes')
            .select('reactions')
            .eq('prompt_date', p.prompt_date);
          const totalReactions = (takes || []).reduce((sum: number, t: { reactions?: Record<string, number> }) => {
            const r = t.reactions || {};
            return sum + Object.values(r).reduce((a: number, b: number) => a + b, 0);
          }, 0);
          return {
            ...p,
            engagement: (takesCount || 0) + (commentsCount || 0) + totalReactions
          };
        })
      );
      setPrompts(promptsWithEngagement);
    } catch (err: unknown) {
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  const getPromptForDate = (date: Date) => prompts.find(p => isSameDay(new Date(p.prompt_date), date));

  // Count scheduled/unscheduled days
  const scheduledDays = prompts.length;
  const unscheduledDays = days.filter(date => !getPromptForDate(date) && isSameMonth(date, today)).length;

  const handleOpenModal = (date: Date) => {
    setSelectedDate(date);
    setModalPrompt(getPromptForDate(date) || null);
    setShowModal(true);
    setNewPromptText('');
  };

  const handleAddPrompt = async () => {
    if (!selectedDate || !newPromptText.trim()) return;
    setSaving(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { error } = await supabase
        .from('daily_prompts')
        .insert({ prompt_text: newPromptText.trim(), prompt_date: dateStr, status: 'scheduled' });
      if (error) throw error;
      setShowModal(false);
      setNewPromptText('');
      await loadPrompts();
      toast({ title: 'Prompt added!', description: `Prompt scheduled for ${dateStr}.`, variant: 'default' });
    } catch (err: unknown) {
      toast({ title: 'Error adding prompt', description: (err as Error).message || String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleEditPrompt = async () => {
    if (!modalPrompt || !newPromptText.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('daily_prompts')
        .update({ prompt_text: newPromptText.trim() })
        .eq('id', modalPrompt.id);
      if (error) throw error;
      setShowModal(false);
      setNewPromptText('');
      await loadPrompts();
      toast({ title: 'Prompt updated!', description: 'Prompt text updated.', variant: 'default' });
    } catch (err: unknown) {
      toast({ title: 'Error updating prompt', description: (err as Error).message || String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrompt = async () => {
    if (!modalPrompt) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('daily_prompts')
        .delete()
        .eq('id', modalPrompt.id);
      if (error) throw error;
      setShowModal(false);
      await loadPrompts();
      toast({ title: 'Prompt deleted', description: 'Prompt has been archived/deleted.', variant: 'default' });
    } catch (err: unknown) {
      toast({ title: 'Error deleting prompt', description: (err as Error).message || String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleFixWithAI = async () => {
    if (!(modalPrompt || newPromptText)) return;
    setAiLoading(true);
    try {
      const textToFix = newPromptText || modalPrompt?.prompt_text || '';
      const improved = await fixPromptWithAI(textToFix);
      setNewPromptText(improved);
      toast({ title: 'AI improved prompt!', description: 'Prompt text was improved by AI.', variant: 'default' });
    } catch (err: unknown) {
      toast({ title: 'AI error', description: (err as Error).message || String(err), variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  // Check for duplicate prompt text
  const checkDuplicatePrompt = (text: string) => {
    if (!text.trim()) {
      setDuplicateWarning(null);
      return;
    }
    const lower = text.trim().toLowerCase();
    const found = prompts.find(p => p.prompt_text.toLowerCase().includes(lower) || lower.includes(p.prompt_text.toLowerCase()));
    if (found) {
      setDuplicateWarning(`Warning: Similar prompt already exists for ${found.prompt_date}: "${found.prompt_text.slice(0, 60)}${found.prompt_text.length > 60 ? '...' : ''}"`);
    } else {
      setDuplicateWarning(null);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Prompt Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-2">
          <span className="text-sm text-brand-primary font-semibold">Scheduled: {scheduledDays}</span>
          <span className="text-sm text-brand-accent font-semibold">Unscheduled: {unscheduledDays}</span>
        </div>
        <div className="grid grid-cols-7 gap-2 text-xs sm:text-sm">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-xs text-brand-accent text-center">{d}</div>
          ))}
          {days.map((date, idx) => {
            const prompt = getPromptForDate(date);
            const colorClass = getDayColor(prompt);
            return (
              <div key={idx} className="relative group">
                <Button
                  variant={isSameMonth(date, today) ? 'outline' : 'ghost'}
                  className={`h-16 flex flex-col items-center justify-center w-full ${colorClass} ${isSameDay(date, today) ? 'ring-2 ring-red-500' : ''}`}
                  onClick={() => handleOpenModal(date)}
                >
                  <span className="text-xs">{format(date, 'd')}</span>
                  {prompt ? (
                    <span className="text-xs mt-1 truncate w-full">{prompt.prompt_text.slice(0, 16)}...</span>
                  ) : (
                    <span className="text-xs mt-1 text-brand-accent">+ Add</span>
                  )}
                </Button>
                {/* Tooltip */}
                {prompt && (
                  <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-brand-primary text-brand-text text-xs rounded px-2 py-1 shadow-lg w-48">
                    <div className="font-bold mb-1">{prompt.prompt_text.slice(0, 60)}{prompt.prompt_text.length > 60 ? '...' : ''}</div>
                    <div>Engagement: <span className="font-semibold">{prompt.engagement}</span></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Modal for prompt details/editing */}
        {showModal && selectedDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 transition-opacity duration-200">
            <div className="bg-gray-900 rounded-lg p-4 sm:p-6 w-full max-w-xs sm:max-w-md shadow-lg scale-95 sm:scale-100 transition-transform duration-200">
              <h2 className="text-lg sm:text-xl font-bold mb-2">{format(selectedDate, 'PPP')}</h2>
              {/* Show prompt details or add form */}
              {modalPrompt ? (
                <div>
                  <div className="mb-2 text-sm sm:text-base">Prompt: <span className="font-semibold">{modalPrompt.prompt_text}</span></div>
                  <div className="mb-2 text-sm sm:text-base">Engagement: <span className="font-semibold">{modalPrompt.engagement}</span></div>
                  <Button className="mb-2 w-full" onClick={handleFixWithAI} disabled={aiLoading}>{aiLoading ? (<><Spinner />Thinking...</>) : 'Fix with AI'}</Button>
                  <Input
                    className="w-full mb-2 p-2 rounded bg-gray-800 text-white text-sm"
                    value={newPromptText}
                    onChange={e => { setNewPromptText(e.target.value); checkDuplicatePrompt(e.target.value); }}
                    placeholder="Edit prompt text..."
                  />
                  {duplicateWarning && <div className="text-brand-primary bg-brand-surface rounded px-2 py-1 mt-1 text-xs font-semibold">{duplicateWarning}</div>}
                  <Button className="mb-2 w-full" onClick={handleEditPrompt} disabled={saving}>Save Edit</Button>
                  <Button className="mb-2 w-full" onClick={handleDeletePrompt} variant="destructive" disabled={saving}>Archive/Delete</Button>
                </div>
              ) : (
                <div>
                  <div className="mb-2 text-sm">No prompt scheduled.</div>
                  <Input
                    className="w-full mb-2 p-2 rounded bg-gray-800 text-white text-sm"
                    value={newPromptText}
                    onChange={e => { setNewPromptText(e.target.value); checkDuplicatePrompt(e.target.value); }}
                    placeholder="Enter prompt text..."
                  />
                  {duplicateWarning && <div className="text-brand-primary bg-brand-surface rounded px-2 py-1 mt-1 text-xs font-semibold">{duplicateWarning}</div>}
                  <Button className="mb-2 w-full" onClick={handleAddPrompt} disabled={saving}>Add Prompt</Button>
                  <Button className="mb-2 w-full" onClick={handleFixWithAI}>{aiLoading ? (<><Spinner />Thinking...</>) : 'Generate with AI'}</Button>
                </div>
              )}
              <Button variant="outline" className="w-full mt-2" onClick={() => setShowModal(false)}>Close</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PromptCalendar; 