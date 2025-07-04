import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/lib/supabase';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ clientSecret, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (err) {
      onError(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto p-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || loading}
        className="mt-4 w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
};

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

  // Memoize the options object to prevent React Stripe warnings
  const options = useMemo(() => {
    if (!clientSecret) return null;
    return { clientSecret };
  }, [clientSecret]);

  const initializePayment = async () => {
    try {
      setIsInitializing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('late-submission-payment', {
        body: {
          amount,
          userId: user.id,
          promptDate: new Date().toISOString().split('T')[0], // Use today's date as default
          description,
        },
      });

      if (error) throw error;
      setClientSecret(data.clientSecret);
    } catch (err) {
      onError(err.message || 'Failed to initialize payment');
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    initializePayment();
  }, [amount, description]); // Only re-initialize if amount or description changes

  if (isInitializing) {
    return <div>Loading payment form...</div>;
  }

  if (!clientSecret || !options) {
    return <div>Failed to load payment form</div>;
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentForm
        clientSecret={clientSecret}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}; 