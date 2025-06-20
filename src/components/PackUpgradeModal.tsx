import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, UserX, Zap, History, Plus, Clock, Eye } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';

interface PackUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  packType: 'delete' | 'anonymous' | 'boost' | 'history' | 'extra_takes' | 'late_submit' | 'sneak_peek';
  onPurchase: (type: string, uses: number) => void;
}

const packConfigs = {
  anonymous: {
    icon: UserX,
    title: 'Anonymous Pack',
    description: 'Post without revealing your identity',
    options: [
      { uses: 3, label: '3 Anonymous Posts', price: '$1.99' },
      { uses: 10, label: '10 Anonymous Posts', price: '$4.99' }
    ]
  },
  late_submit: {
    icon: Clock,
    title: 'Late Submit Pack',
    description: 'Submit takes late with credits',
    options: [
      { uses: 1, label: '1 Late Submit', price: '$0.99' },
      { uses: 5, label: '5 Late Submits', price: '$3.99' }
    ]
  },
  sneak_peek: {
    icon: Eye,
    title: 'Sneak Peek Pack',
    description: 'Unlock future takes with credits',
    options: [
      { uses: 1, label: '1 Sneak Peek', price: '$0.99' },
      { uses: 5, label: '5 Sneak Peeks', price: '$3.99' }
    ]
  },
  boost: {
    icon: Zap,
    title: 'Boost Pack',
    description: 'Highlight your takes for more visibility',
    options: [
      { uses: 1, label: '1 Boost', price: '$1.49' },
      { uses: 3, label: '3 Boosts', price: '$3.99' }
    ]
  },
  extra_takes: {
    icon: Plus,
    title: 'Extra Take Pack',
    description: 'Submit additional takes per day',
    options: [
      { uses: 1, label: '1 Extra Take', price: '$0.99' },
      { uses: 5, label: '5 Extra Takes', price: '$3.99' }
    ]
  },
  delete: {
    icon: Trash2,
    title: 'Delete Pack',
    description: 'Remove your takes when you change your mind',
    options: [
      { uses: 1, label: '1 Delete', price: '$0.99' },
      { uses: 5, label: '5 Deletes', price: '$3.99' }
    ]
  }
};

export const PackUpgradeModal: React.FC<PackUpgradeModalProps> = ({
  isOpen,
  onClose,
  packType,
  onPurchase
}) => {
  const { userCredits } = useAppContext();
  const config = packConfigs[packType];
  const Icon = config.icon;

  const handlePurchase = (uses: number) => {
    onPurchase(packType, uses);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            {config.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {config.description}
          </p>
          
          <div className="space-y-3">
            {config.options.map((option, index) => (
              <Card key={index} className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handlePurchase(option.uses)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm">{option.label}</CardTitle>
                      <CardDescription className="text-xs">
                        {option.uses === 1 && packType === 'history' ? 'One-time unlock' : `${option.uses} uses`}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{option.price}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <Button variant="outline" onClick={onClose} className="w-full">
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};