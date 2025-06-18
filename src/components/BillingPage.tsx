import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BillingModal from './BillingModal';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { FeaturePack } from '@/types';

const { userCredits } = useAppContext();

const packages = [
  { name: 'Anonymous Credits', description: 'Post anonymously with credits', price: '$2.99 for 10', id: 'anonymous' },
  { name: 'Late Submit Credits', description: 'Submit takes late with credits', price: '$1.99 for 5', id: 'late_submit' },
  { name: 'Sneak Peek Credits', description: 'Unlock future takes with credits', price: '$3.99 for 5', id: 'sneak_peek' },
  { name: 'Boost Credits', description: 'Boost your take to the top', price: '$4.99 for 3', id: 'boost' },
  { name: 'Extra Takes Credits', description: 'Submit additional takes per day', price: '$2.99 for 5', id: 'extra_takes' },
  { name: 'Delete Credits', description: 'Delete your takes', price: '$1.99 for 5', id: 'delete' },
];

// Define a local Purchase type based on usage
interface Purchase {
  id: string;
  user_id: string;
  feature: string;
  quantity: number;
  created_at: string;
}

const BillingPage: React.FC = () => {
  const { user } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [featurePacks, setFeaturePacks] = useState<FeaturePack[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const fetchData = async () => {
      const { data: purchasesData } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setPurchases(purchasesData || []);
      const { data: packsData } = await supabase
        .from('feature_packs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setFeaturePacks(packsData || []);
    };
    fetchData();
  }, [user?.id]);

  const handleCheckout = (pkgId: string) => {
    setSelectedPkg(pkgId);
    setShowModal(true);
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
                <Button onClick={() => handleCheckout(pkg.id)} className="btn-primary w-full">
                  Buy
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <h3 className="font-semibold text-brand-text mb-2">Your Purchases</h3>
            {purchases.length === 0 ? (
              <div className="text-brand-muted text-sm">No purchases yet.</div>
            ) : (
              <ul className="space-y-2">
                {purchases.map((purchase) => (
                  <li key={purchase.id} className="text-sm text-brand-text">
                    {purchase.feature} &times; {purchase.quantity} — {new Date(purchase.created_at).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-8">
            <h3 className="font-semibold text-brand-text mb-2">Your Feature Packs</h3>
            {featurePacks.length === 0 ? (
              <div className="text-brand-muted text-sm">No feature packs yet.</div>
            ) : (
              <ul className="space-y-2">
                {featurePacks.map((pack) => (
                  <li key={pack.id} className="text-sm text-brand-text">
                    {pack.type}: {pack.uses_remaining} uses remaining
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
      <BillingModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
};

export default BillingPage; 