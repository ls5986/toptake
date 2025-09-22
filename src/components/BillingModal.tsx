import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { StripePayment } from './StripePayment';
import { supabase } from '@/lib/supabase';

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreditPackage {
  name: string;
  description: string;
  price: number;
  credits: number;
  id: string;
  type: 'anonymous' | 'late_submit' | 'sneak_peek' | 'boost' | 'extra_takes' | 'delete';
  lookupKey: string;
}

const packages: CreditPackage[] = [
  { 
    name: 'Anonymous Credits', 
    description: 'Post anonymously with credits', 
    price: 2.99, 
    credits: 10, 
    id: 'anonymous_credits',
    type: 'anonymous',
    lookupKey: 'credits_anonymous_10_299'
  },
  { 
    name: 'Late Submit Credits', 
    description: 'Submit takes late with credits', 
    price: 1.99, 
    credits: 5, 
    id: 'late_submit_credits',
    type: 'late_submit',
    lookupKey: 'credits_late_submit_5_199'
  },
  { 
    name: 'Sneak Peek Credits', 
    description: 'Unlock future takes with credits', 
    price: 3.99, 
    credits: 5, 
    id: 'sneak_peek_credits',
    type: 'sneak_peek',
    lookupKey: 'credits_sneak_peek_5_399'
  },
  { 
    name: 'Boost Credits', 
    description: 'Boost your take to the top', 
    price: 4.99, 
    credits: 3, 
    id: 'boost_credits',
    type: 'boost',
    lookupKey: 'credits_boost_3_499'
  },
  { 
    name: 'Extra Takes Credits', 
    description: 'Submit additional takes per day', 
    price: 2.99, 
    credits: 5, 
    id: 'extra_takes_credits',
    type: 'extra_takes',
    lookupKey: 'credits_extra_takes_5_299'
  },
  { 
    name: 'Delete Credits', 
    description: 'Delete your takes', 
    price: 1.99, 
    credits: 5, 
    id: 'delete_credits',
    type: 'delete',
    lookupKey: 'credits_delete_5_199'
  },
];

const BillingModal: React.FC<BillingModalProps> = ({ isOpen, onClose }) => {
  const { userCredits, refreshUserCredits } = useAppContext();
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePaymentSuccess = async () => {
    if (!selectedPackage) return;

    try {
      // Update user credits in the database
      const { error: updateError } = await supabase
        .from('user_credits')
        .upsert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          [selectedPackage.type]: (userCredits[selectedPackage.type] || 0) + selectedPackage.credits
        });

      if (updateError) throw updateError;

      // Refresh user credits in the app
      await refreshUserCredits();
      
      // Reset state and close modal
      setSelectedPackage(null);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update credits');
    }
  };

  const handlePaymentError = (error: string) => {
    setError(error);
    setTimeout(() => setError(null), 5000);
  };

  const handleClose = () => {
    setSelectedPackage(null);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Billing & Packages</DialogTitle>
          <DialogDescription>
            Purchase credits to unlock features. Select a package below.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold">{pkg.name}</h3>
                  <p className="text-sm text-gray-600">{pkg.description}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold">${pkg.price}</div>
                  <div className="text-sm text-gray-600">{pkg.credits} credits</div>
                </div>
              </div>
              
              {selectedPackage?.id === pkg.id ? (
                <StripePayment
                  amount={pkg.price}
                  description={`${pkg.name} - ${pkg.credits} credits`}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  lookupKey={pkg.lookupKey}
                  mode="payment"
                  metadata={{ product_type: pkg.type }}
                />
              ) : (
                <Button 
                  onClick={() => setSelectedPackage(pkg)}
                  className="w-full"
                >
                  Buy Now
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillingModal; 