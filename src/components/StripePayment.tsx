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
}

export const StripePayment: React.FC<StripePaymentProps> = ({
  amount,
  description,
  onSuccess,
  onError,
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

  // Production mode - Stripe implementation would go here
  // For now, just show a placeholder
  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="p-6 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">🚀 Production Mode</h3>
        <p className="text-blue-700 mb-3">Stripe integration would be enabled here.</p>
      </div>
    </div>
  );
}; 