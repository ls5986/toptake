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
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-purple-400">
              <Ghost className="w-6 h-6 mr-2" />
              Out of Anonymous Posts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              You have used all 3 free anonymous posts. Stay hidden with more credits!
            </p>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">5 Anonymous Posts</h3>
                  <p className="text-sm text-gray-400">Post without revealing identity</p>
                </div>
                <Badge className="bg-purple-600">$1.99</Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Maybe Later
              </Button>
              <StripeIntegration
                priceId={STRIPE_PRICES.ANONYMOUS_CREDITS}
                amount="$1.99"
                description="5 Anonymous Posts"
                onSuccess={() => handlePurchaseSuccess('anonymous')}
              >
                <Button className="flex-1 bg-purple-600 hover:bg-purple-700">
                  Buy Now
                </Button>
              </StripeIntegration>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Streak Restore Modal */}
      <Dialog open={showStreakModal} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-400">
              <Flame className="w-6 h-6 mr-2" />
              Streak Broken!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              You missed yesterday. Your streak is gone forever... unless?
            </p>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Revive Streak</h3>
                  <p className="text-sm text-gray-400">Restore your streak like nothing happened</p>
                </div>
                <Badge className="bg-red-600">$2.99</Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Accept Defeat
              </Button>
              <StripeIntegration
                priceId={STRIPE_PRICES.STREAK_RESTORE}
                amount="$2.99"
                description="Streak Restore"
                onSuccess={() => handlePurchaseSuccess('streak')}
              >
                <Button className="flex-1 bg-red-600 hover:bg-red-700">
                  Revive Streak
                </Button>
              </StripeIntegration>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Premium Modal */}
      <Dialog open={showPremiumModal} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-yellow-400">
              <Crown className="w-6 h-6 mr-2" />
              TopTake Premium
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <span className="text-green-400 mr-2">✓</span>
                Unlimited anonymous posts
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-400 mr-2">✓</span>
                Auto-streak protection
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-400 mr-2">✓</span>
                Early access to prompts
              </div>
              <div className="flex items-center text-sm">
                <span className="text-green-400 mr-2">✓</span>
                Premium badge
              </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Monthly Premium</h3>
                  <p className="text-sm text-gray-400">All premium features</p>
                </div>
                <Badge className="bg-yellow-600">$4.99/mo</Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Not Now
              </Button>
              <StripeIntegration
                priceId={STRIPE_PRICES.PREMIUM_MONTHLY}
                amount="$4.99/mo"
                description="Premium Monthly"
                onSuccess={() => handlePurchaseSuccess('premium')}
              >
                <Button className="flex-1 bg-yellow-600 hover:bg-yellow-700">
                  Go Premium
                </Button>
              </StripeIntegration>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Boost Modal */}
      <Dialog open={showBoostModal} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center text-blue-400">
              <Zap className="w-6 h-6 mr-2" />
              Boost Your Take
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Make your take appear at the top of the feed for 24 hours!
            </p>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">24-Hour Boost</h3>
                  <p className="text-sm text-gray-400">Pin to top of feed</p>
                </div>
                <Badge className="bg-blue-600">$0.99</Badge>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Skip
              </Button>
              <StripeIntegration
                priceId={STRIPE_PRICES.BOOST_24H}
                amount="$0.99"
                description="24-Hour Boost"
                onSuccess={() => handlePurchaseSuccess('boost')}
              >
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700">
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