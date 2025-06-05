import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface BoostPromptModalProps {
  reason: string;
  setReason: (reason: string) => void;
  handleBoost: () => void;
  loading: boolean;
  onClose: () => void;
}

const BoostPromptModal: React.FC<BoostPromptModalProps> = ({ reason, setReason, handleBoost, loading, onClose }) => (
  <div>
    <Textarea
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      placeholder="Why should this prompt be boosted?"
      className=""
    />
    <div className="flex gap-2 mt-4">
      <Button
        onClick={handleBoost}
        disabled={!reason.trim() || loading}
        className="btn-primary w-full"
      >
        {loading ? 'Boosting...' : 'Boost'}
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

export default BoostPromptModal; 