import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Ghost, Flame, Zap } from 'lucide-react';
import { StripeIntegration, STRIPE_PRICES } from './StripeIntegration';

interface MonetizationModalsProps {
  showAnonymousModal: boolean;
  showStreakModal: boolean;
  showPremiumModal: boolean;
  showBoostModal: boolean;
  onClose: () => void;
  onPurchase: (type: string) => void;
}

export const MonetizationModals = ({
  showAnonymousModal,
  showStreakModal,
  showPremiumModal,
  showBoostModal,
  onClose,
  onPurchase
}: MonetizationModalsProps) => {
  const handlePurchaseSuccess = (type: string) => {
    onPurchase(type);
    onClose();
  };

  return (
    <>
      {/* Anonymous Credits Modal */}
      <Dialog open={showAnonymousModal} onOpenChange={onClose}>
        <DialogContent className="bg-brand-background border-brand-border text-brand-text">
          <DialogHeader>
            <DialogTitle className="flex items-center text-brand-accent">
              <Ghost className="w-6 h-6 mr-2 text-brand-accent" />
              Out of Anonymous Posts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-brand-muted">
              You have used all 3 free anonymous posts. Stay hidden with more credits!
            </p>
            <div className="bg-brand-surface p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">5 Anonymous Posts</h3>
                  <p className="text-sm text-brand-muted">Post without revealing identity</p>
                </div>
                <Badge className="bg-brand-accent">$1.99</Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose} className="flex-1 border-brand-border text-brand-text">
                Maybe Later
              </Button>
              <StripeIntegration
                priceId={STRIPE_PRICES.ANONYMOUS_CREDITS}
                amount="$1.99"
                description="5 Anonymous Posts"
                onSuccess={() => handlePurchaseSuccess('anonymous')}
              >
                <Button className="btn-primary flex-1">
                  Buy Now
                </Button>
              </StripeIntegration>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Streak Restore Modal */}
      <Dialog open={showStreakModal} onOpenChange={onClose}>
        <DialogContent className="bg-brand-background border-brand-border text-brand-text">
          <DialogHeader>
            <DialogTitle className="flex items-center text-brand-primary">
              <Flame className="w-6 h-6 mr-2 text-brand-primary" />
              Streak Broken!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-brand-muted">
              You missed yesterday. Your streak is gone forever... unless?
            </p>
            <div className="bg-brand-surface p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Revive Streak</h3>
                  <p className="text-sm text-brand-muted">Restore your streak like nothing happened</p>
                </div>
                <Badge className="bg-brand-danger">$2.99</Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose} className="flex-1 border-brand-border text-brand-text">
                Accept Defeat
              </Button>
              <StripeIntegration
                priceId={STRIPE_PRICES.STREAK_RESTORE}
                amount="$2.99"
                description="Streak Restore"
                onSuccess={() => handlePurchaseSuccess('streak')}
              >
                <Button className="btn-primary flex-1">
                  Revive Streak
                </Button>
              </StripeIntegration>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Modal */}
      <Dialog open={showPremiumModal} onOpenChange={onClose}>
        <DialogContent className="bg-brand-background border-brand-border text-brand-text">
          <DialogHeader>
            <DialogTitle className="flex items-center text-brand-primary">
              <Crown className="w-6 h-6 mr-2 text-brand-primary" />
              TopTake Premium
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm text-brand-success">
                <span className="mr-2">✓</span>
                Unlimited anonymous posts
              </div>
              <div className="flex items-center text-sm text-brand-success">
                <span className="mr-2">✓</span>
                Auto-streak protection
              </div>
              <div className="flex items-center text-sm text-brand-success">
                <span className="mr-2">✓</span>
                Early access to prompts
              </div>
              <div className="flex items-center text-sm text-brand-success">
                <span className="mr-2">✓</span>
                Premium badge
              </div>
            </div>
            <div className="bg-brand-surface p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Monthly Premium</h3>
                  <p className="text-sm text-brand-muted">All premium features</p>
                </div>
                <Badge className="bg-brand-primary">$4.99/mo</Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose} className="flex-1 border-brand-border text-brand-text">
                Not Now
              </Button>
              <StripeIntegration
                priceId={STRIPE_PRICES.PREMIUM_MONTHLY}
                amount="$4.99/mo"
                description="Premium Monthly"
                onSuccess={() => handlePurchaseSuccess('premium')}
              >
                <Button className="btn-primary flex-1">
                  Go Premium
                </Button>
              </StripeIntegration>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Boost Modal */}
      <Dialog open={showBoostModal} onOpenChange={onClose}>
        <DialogContent className="bg-brand-background border-brand-border text-brand-text">
          <DialogHeader>
            <DialogTitle className="flex items-center text-brand-accent">
              <Zap className="w-6 h-6 mr-2 text-brand-accent" />
              Boost Your Take
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-brand-muted">
              Make your take appear at the top of the feed for 24 hours!
            </p>
            <div className="bg-brand-surface p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">24-Hour Boost</h3>
                  <p className="text-sm text-brand-muted">Pin to top of feed</p>
                </div>
                <Badge className="bg-brand-accent">$0.99</Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose} className="flex-1 border-brand-border text-brand-text">
                Skip
              </Button>
              <StripeIntegration
                priceId={STRIPE_PRICES.BOOST_24H}
                amount="$0.99"
                description="24-Hour Boost"
                onSuccess={() => handlePurchaseSuccess('boost')}
              >
                <Button className="btn-primary flex-1">
                  Boost Now
                </Button>
              </StripeIntegration>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};