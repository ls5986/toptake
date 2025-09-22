import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface StripePaymentProps {
  amount: number;
  description: string;
  onSuccess: () => void;
  onError: (error: string) => void;
  lookupKey?: string;
  mode?: 'payment' | 'subscription';
  metadata?: Record<string, any>;
}

export const StripePayment: React.FC<StripePaymentProps> = ({
  amount,
  description,
  onSuccess,
  onError,
  lookupKey,
  mode = 'payment',
  metadata,
}) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const { toast } = useToast();

  // In development mode, show mock payment only
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="w-full max-w-md mx-auto p-4">
        <div className="p-6 border-2 border-dashed border-green-400 rounded-lg bg-green-50">
          <h3 className="text-lg font-semibold text-green-800 mb-2">🧪 Development Mode</h3>
          <p className="text-green-700 mb-3">Stripe is disabled. Use this button to test payments:</p>
          <button
            onClick={async () => {
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('User not authenticated');
                
                // Mock successful payment
                console.log('🧪 Mock payment for $' + amount);
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Update user credits directly
                const { error: creditError } = await supabase
                  .from('user_credits')
                  .upsert({
                    user_id: user.id,
                    credit_type: 'late_submit',
                    balance: 1,
                    created_at: new Date().toISOString()
                  }, {
                    onConflict: 'user_id,credit_type',
                    count: 'balance'
                  });

                if (creditError) {
                  console.error('Error updating user credits:', creditError);
                }

                onSuccess();
              } catch (err) {
                onError(err.message || 'Mock payment failed');
              }
            }}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 font-semibold"
          >
            🧪 Test Payment (Mock)
          </button>
        </div>
      </div>
    );
  }

  // Production mode - create a Checkout Session via backend and redirect
  return (
    <div className="w-full">
      <Button
        onClick={async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');
            if (!lookupKey) throw new Error('Missing product mapping (lookupKey)');

            const backendUrl = (import.meta as any)?.env?.VITE_BACKEND_URL || 'https://toptake.onrender.com';
            const resp = await fetch(`${backendUrl}/api/create-checkout-session`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                lookupKey,
                userId: user.id,
                mode,
                metadata: metadata || {}
              })
            });
            if (!resp.ok) throw new Error('Failed to create checkout session');
            const body = await resp.json();
            if (body.free) {
              onSuccess();
              return;
            }
            if (!body.url) throw new Error('Checkout URL missing');
            try { localStorage.setItem('pendingCheckout', '1'); } catch {}
            window.location.href = body.url;
          } catch (err: any) {
            onError(err?.message || 'Failed to start checkout');
          }
        }}
        className="w-full"
      >
        Checkout with Stripe
      </Button>
    </div>
  );
}; 