import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { UsernameModal } from './UsernameModal';
import { Sparkles, Crown, Flame, Ghost } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MissedStreakModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { user, setUser } = useAppContext();
  
  const handleRestore = () => {
    if (user) {
      setUser({ ...user, streak: user.streak + 1 });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-brand-background bg-opacity-80 flex items-center justify-center p-6 z-50">
      <Card className="bg-brand-surface border-brand-border max-w-sm">
        <CardHeader>
          <CardTitle className="text-brand-accent text-center flex items-center justify-center gap-2">
            <Flame className="w-5 h-5 text-brand-accent" />
            Missed your streak?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-brand-muted">Revive it for $2.99</p>
          <div className="space-y-2">
            <Button onClick={handleRestore} className="w-full bg-brand-primary hover:bg-brand-accent text-brand-text">
              Restore Streak - $2.99
            </Button>
            <Button onClick={onClose} variant="outline" className="w-full border-brand-border text-brand-text">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const PremiumModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-brand-background bg-opacity-80 flex items-center justify-center p-6 z-50">
      <Card className="bg-brand-surface border-brand-border max-w-sm">
        <CardHeader>
          <CardTitle className="text-brand-primary text-center flex items-center justify-center gap-2">
            <Crown className="w-5 h-5 text-brand-primary" />
            Go Premium
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-brand-muted">Unlock special features for $4.99/month</p>
          <ul className="text-sm text-brand-muted space-y-1">
            <li>• View feed without posting</li>
            <li>• Anonymous analytics</li>
            <li>• Choose prompt categories</li>
          </ul>
          <div className="space-y-2">
            <Button onClick={onClose} className="w-full bg-brand-primary hover:bg-brand-accent text-brand-text">
              Subscribe - $4.99/mo
            </Button>
            <Button onClick={onClose} variant="outline" className="w-full border-brand-border text-brand-text">
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const BlockingModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-brand-background bg-opacity-80 flex items-center justify-center p-6 z-50">
      <Card className="bg-brand-surface border-brand-border max-w-sm">
        <CardHeader>
          <CardTitle className="text-brand-accent text-center flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-accent" />
            You haven't posted today
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-brand-muted">Submit your take to unlock the app</p>
          <Button onClick={onClose} className="w-full bg-brand-primary hover:bg-brand-accent text-brand-text">
            Post Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export { UsernameModal };