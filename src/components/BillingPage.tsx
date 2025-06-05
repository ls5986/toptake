import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const packages = [
  { name: 'Anonymous Credits', description: 'Post anonymously with credits', price: '$2.99 for 10', id: 'anon' },
  { name: 'Delete Uses', description: 'Delete your takes', price: '$1.99 for 5', id: 'delete' },
  { name: 'Boosts', description: 'Boost your take to the top', price: '$4.99 for 3', id: 'boost' },
];

const BillingPage: React.FC = () => {
  const handleCheckout = async (pkgId: string) => {
    // TODO: Replace with real Stripe checkout integration
    alert(`Redirecting to Stripe checkout for package: ${pkgId}`);
    // Example: await fetch('/api/create-checkout-session', { method: 'POST', body: JSON.stringify({ pkgId }) })
  };

  return (
    <div className="max-w-lg mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Billing & Packages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {packages.map((pkg) => (
              <div key={pkg.id} className="mb-4">
                <div className="font-semibold text-brand-text">{pkg.name}</div>
                <div className="text-brand-muted text-sm mb-1">{pkg.description}</div>
                <div className="text-brand-accent font-bold mb-2">{pkg.price}</div>
                <Button onClick={() => handleCheckout(pkg.id)} className="w-full bg-brand-accent hover:bg-brand-primary">
                  Buy
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingPage; 