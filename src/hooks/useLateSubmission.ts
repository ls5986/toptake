import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { loadStripe } from '@stripe/stripe-js';

const supabaseClient = createBrowserClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

export const useLateSubmission = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const processLateSubmission = async (promptDate: string, amount: number) => {
    try {
      setLoading(true);
      setError(null);

      // Get current user
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Start a transaction
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError) throw sessionError;

      // Create payment intent
      const { data: { clientSecret }, error: paymentError } = await supabaseClient.functions.invoke('late-submission-payment', {
        body: {
          amount,
          userId: user.id,
          promptDate,
          sessionToken: session?.access_token
        }
      });

      if (paymentError) throw paymentError;

      // Load Stripe
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe failed to load');

      // Confirm payment
      const { error: confirmError } = await stripe.confirmCardPayment(clientSecret);
      if (confirmError) throw confirmError;

      // Record credit history
      const { error: historyError } = await supabase
        .from('credit_history')
        .insert({
          user_id: user.id,
          credit_type: 'late_submit',
          amount: 1,
          action: 'purchase',
          price: amount,
          stripe_payment_id: clientSecret,
          created_at: new Date().toISOString()
        });

      if (historyError) {
        console.error('Error recording credit history:', historyError);
        // Don't throw here, as the payment was successful
      }

      // Update user credits
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
        // Don't throw here, as the payment was successful
      }

      toast({ 
        title: "Payment successful", 
        description: "You can now submit your late take.",
        variant: "default" 
      });

      return true;
    } catch (err) {
      console.error('Late submission error:', err);
      setError(err.message);
      toast({ 
        title: "Payment failed", 
        description: err.message,
        variant: "destructive" 
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkLateSubmissionStatus = async (promptDate: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .rpc('has_paid_late_submission', {
          user_id: user.id,
          prompt_date: promptDate
        });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error checking late submission status:', err);
      setError(err.message);
      return false;
    }
  };

  return {
    processLateSubmission,
    checkLateSubmissionStatus,
    loading,
    error
  };
}; 