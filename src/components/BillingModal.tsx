import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const packages = [
  { name: 'Anonymous Credits', description: 'Post anonymously with credits', price: '$2.99 for 10', id: 'anon' },
  { name: 'Delete Uses', description: 'Delete your takes', price: '$1.99 for 5', id: 'delete' },
  { name: 'Boosts', description: 'Boost your take to the top', price: '$4.99 for 3', id: 'boost' },
];

const BillingModal: React.FC<BillingModalProps> = ({ isOpen, onClose }) => {
  const handleCheckout = async (pkgId: string) => {
    // TODO: Replace with real Stripe checkout integration
    alert(`Redirecting to Stripe checkout for package: ${pkgId}`);
    // Example: await fetch('/api/create-checkout-session', { method: 'POST', body: JSON.stringify({ pkgId }) })
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Billing & Packages</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {packages.map((pkg) => (
            <div key={pkg.id} className="mb-4">
              <div className="font-semibold text-brand-text">{pkg.name}</div>
              <div className="text-brand-muted text-sm mb-1">{pkg.description}</div>
              <div className="text-brand-accent font-bold mb-2">{pkg.price}</div>
              <Button onClick={() => handleCheckout(pkg.id)} className="btn-primary w-full">
                Buy
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BillingModal; 