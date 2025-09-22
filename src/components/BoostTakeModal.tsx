import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { spendCredits } from '@/lib/credits';
import { useToast } from '@/hooks/use-toast';

interface BoostTakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  takeId: string;
  onBoostSuccess?: () => void;
}

const BoostTakeModal: React.FC<BoostTakeModalProps> = ({ 
  isOpen, 
  onClose, 
  takeId, 
  onBoostSuccess 
}) => {
  const { user, userCredits, setUserCredits } = useAppContext();
  const { toast } = useToast();
  const [isBoosting, setIsBoosting] = useState(false);

  const handleBoost = async () => {
    if (!user?.id) {
      toast({ 
        title: 'Error', 
        description: 'User not found', 
        variant: 'destructive' 
      });
      return;
    }

    if (userCredits.boost <= 0) {
      toast({ 
        title: 'Insufficient Credits', 
        description: 'You need boost credits to boost a take. Purchase some credits to continue.', 
        variant: 'destructive' 
      });
      return;
    }

    try {
      setIsBoosting(true);
      
      // Spend the boost credit
      const spent = await spendCredits(user.id, 'boost', 1);
      if (!spent) {
        toast({ 
          title: 'Error', 
          description: 'Failed to spend boost credit. Please try again.', 
          variant: 'destructive' 
        });
        return;
      }

      // Update local state
      setUserCredits({ ...userCredits, boost: userCredits.boost - 1 });
      toast({ title: 'Boost credit used', description: '-1 Boost credit' });

      // TODO: Implement actual boost logic here
      // This would typically involve updating the take in the database
      // to mark it as boosted and potentially move it to the top of feeds
      
      toast({ 
        title: 'Take Boosted!', 
        description: 'Your take has been boosted and will appear more prominently.' 
      });

      onBoostSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Error boosting take:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to boost take. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsBoosting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Boost Your Take</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Boost your take to make it more visible in feeds and increase engagement.
          </p>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium">Your Boost Credits: {userCredits.boost}</p>
            <p className="text-xs text-gray-500">Cost: 1 boost credit</p>
          </div>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={onClose} disabled={isBoosting}>
              Cancel
            </Button>
            <Button 
              onClick={handleBoost} 
              className="btn-primary"
              disabled={isBoosting || userCredits.boost <= 0}
            >
              {isBoosting ? 'Boosting...' : 'Boost Take'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BoostTakeModal; 