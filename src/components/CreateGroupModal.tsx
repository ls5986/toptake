import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (threadId: string) => void;
}

const CreateGroupModal: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'private'>('private');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | ''>('');
  const [promptSource, setPromptSource] = useState<'manual' | 'csv' | 'ai'>('manual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) { setError('Enter a group name'); return; }
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.rpc('create_group', {
        p_name: name.trim(),
        p_privacy: privacy,
        p_frequency: frequency || null,
        p_description: null,
        p_prompt_source: promptSource
      });
      if (error) throw error;
      onCreated(data as any);
    } catch (e: any) {
      setError(e?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open)=>{ if (!open && !loading) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create group</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-brand-muted">Group name</label>
            <input className="w-full p-2 rounded bg-brand-surface border border-brand-border" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-brand-muted">Privacy</label>
              <select className="w-full p-2 rounded bg-brand-surface border border-brand-border" value={privacy} onChange={e=>setPrivacy(e.target.value as any)}>
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-brand-muted">Frequency</label>
              <select className="w-full p-2 rounded bg-brand-surface border border-brand-border" value={frequency} onChange={e=>setFrequency(e.target.value as any)}>
                <option value="">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-brand-muted">Prompt source</label>
            <select className="w-full p-2 rounded bg-brand-surface border border-brand-border" value={promptSource} onChange={e=>setPromptSource(e.target.value as any)}>
              <option value="manual">Manual</option>
              <option value="csv">CSV Upload</option>
              <option value="ai">AI Generated</option>
            </select>
            <div className="text-[11px] text-brand-muted mt-1">CSV/AI wiring next; manual lets you add prompts later.</div>
          </div>
          {error && <div className="text-brand-danger text-sm">{error}</div>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !name.trim()}>{loading ? 'Creating…' : 'Create'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;


