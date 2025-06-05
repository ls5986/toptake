import React from 'react';
import { Button } from '@/components/ui/button';

interface LateSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: () => void;
  date: Date;
}

const LateSubmitModal: React.FC<LateSubmitModalProps> = ({ isOpen, onClose, onPurchase, date }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-brand-surface p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-2 text-brand-danger">Missed Prompt?</h2>
        <p className="mb-4 text-brand-text">You didn't submit a take for {date.toLocaleDateString()}. Unlock late submit to post your take and keep your streak or earn rewards!</p>
        <Button className="btn-primary w-full mb-2" onClick={onPurchase}>Unlock Late Submit</Button>
        <Button className="w-full" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
};

export default LateSubmitModal; 