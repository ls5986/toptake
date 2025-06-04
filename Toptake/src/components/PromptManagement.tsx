import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface PromptManagementProps {
  prompts: any[];
  onPromptsUpdate: () => void;
}

const PromptManagement: React.FC<PromptManagementProps> = ({ prompts, onPromptsUpdate }) => {
  const [newPrompt, setNewPrompt] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [editingPrompt, setEditingPrompt] = useState<any>(null);
  const [editText, setEditText] = useState('');
  const { toast } = useToast();

  const addPrompt = async () => {
    if (!newPrompt.trim() || !selectedDate) return;
    
    try {
      const { error } = await supabase
        .from('daily_prompts')
        .insert({
          prompt_text: newPrompt.trim(),
          scheduled_for: selectedDate,
          is_active: false
        });
      
      if (error) throw error;
      
      setNewPrompt('');
      setSelectedDate('');
      onPromptsUpdate();
      toast({ title: 'Prompt scheduled successfully' });
    } catch (error) {
      console.error('Error adding prompt:', error);
      toast({ title: 'Error scheduling prompt', variant: 'destructive' });
    }
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
      onPromptsUpdate();
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
      
      onPromptsUpdate();
      toast({ title: 'Prompt deleted successfully' });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({ title: 'Error deleting prompt', variant: 'destructive' });
    }
  };

  const startEdit = (prompt: any) => {
    setEditingPrompt(prompt);
    setEditText(prompt.prompt_text);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Add New Prompt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Enter prompt text..."
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            rows={3}
          />
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <Button onClick={addPrompt} className="w-full">
            Schedule Prompt
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Prompts ({prompts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {prompts.map((prompt) => (
              <div key={prompt.id} className="p-3 border rounded">
                {editingPrompt?.id === prompt.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={updatePrompt}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingPrompt(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-medium mb-1">
                      {new Date(prompt.scheduled_for).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      {prompt.prompt_text}
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={prompt.is_active ? "default" : "secondary"}>
                        {prompt.is_active ? "Active" : "Scheduled"}
                      </Badge>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => startEdit(prompt)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => deletePrompt(prompt.id)}>Delete</Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptManagement;