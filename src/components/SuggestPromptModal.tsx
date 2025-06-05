import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface SuggestPromptModalProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  handleSubmit: () => void;
  loading: boolean;
  onClose: () => void;
}

const SuggestPromptModal: React.FC<SuggestPromptModalProps> = ({ prompt, setPrompt, handleSubmit, loading, onClose }) => (
  <div>
    <Textarea
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      placeholder="Suggest a prompt..."
      className=""
    />
    <div className="flex gap-2 mt-4">
      <Button
        onClick={handleSubmit}
        disabled={!prompt.trim() || loading}
        className="btn-primary w-full"
      >
        {loading ? 'Submitting...' : 'Submit'}
      </Button>
      <Button
        onClick={onClose}
        className="btn-secondary w-full"
      >
        Cancel
      </Button>
    </div>
  </div>
);

export default SuggestPromptModal; 