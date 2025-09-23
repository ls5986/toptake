import React from 'react';
import { Coins } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

interface Props {
  onClick?: () => void;
}

const CreditsBadge: React.FC<Props> = ({ onClick }) => {
  const { userCredits } = useAppContext();
  const total = (userCredits?.anonymous || 0)
    + (userCredits?.late_submit || 0)
    + (userCredits?.sneak_peek || 0)
    + (userCredits?.boost || 0)
    + (userCredits?.delete || 0);

  return (
    <button
      onClick={onClick}
      className="px-2 py-1 rounded-md border border-brand-border bg-brand-surface hover:bg-brand-background active:opacity-80 flex items-center gap-1 text-sm"
      aria-label="Open credits"
    >
      <Coins className="w-4 h-4 text-brand-accent" />
      <span className="text-brand-text">{total}</span>
    </button>
  );
};

export default CreditsBadge;


