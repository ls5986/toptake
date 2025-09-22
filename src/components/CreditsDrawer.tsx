import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onBuy: (type: 'anonymous' | 'late_submit' | 'sneak_peek' | 'boost' | 'extra_takes' | 'delete') => void;
}

const row = (
  label: string,
  value: number,
  onBuy: () => void,
) => (
  <div className="flex items-center justify-between py-2">
    <div className="text-sm text-brand-text">{label}</div>
    <div className="flex items-center gap-2">
      <span className="text-sm text-brand-text font-medium">{value}</span>
      <Button size="sm" variant="outline" onClick={onBuy}>Buy</Button>
    </div>
  </div>
);

const CreditsDrawer: React.FC<Props> = ({ isOpen, onClose, onBuy }) => {
  const { userCredits } = useAppContext();
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-40" aria-modal="true" role="dialog" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div className="absolute inset-x-0 bottom-0 bg-brand-surface border-t border-brand-border rounded-t-xl p-4" onClick={(e)=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-brand-text">Your credits</div>
          <button className="text-brand-muted hover:text-brand-text" onClick={onClose}>Close</button>
        </div>
        {row('Anonymous', userCredits.anonymous, () => onBuy('anonymous'))}
        {row('Late submit', userCredits.late_submit, () => onBuy('late_submit'))}
        {row('Sneak peek', userCredits.sneak_peek, () => onBuy('sneak_peek'))}
        {row('Boost', userCredits.boost, () => onBuy('boost'))}
        {row('Extra takes', userCredits.extra_takes, () => onBuy('extra_takes'))}
        {row('Delete', userCredits.delete, () => onBuy('delete'))}
      </div>
    </div>
  );
};

export default CreditsDrawer;


