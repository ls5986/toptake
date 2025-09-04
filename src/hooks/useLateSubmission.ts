import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

// Mock payment function for development
const mockPayment = async (amount: number, userId: string) => {
  console.log('🧪 Using mock payment for $' + amount);
  
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock successful payment
  return {
    success: true,
    paymentIntentId: 'mock_pi_' + Date.now(),
    amount: amount,
    userId: userId
  };
};

export const useLateSubmission = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const processLateSubmission = async (promptDate: string, amount: number) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // In development mode, or if admin tester in production, use mock payment
      const isAdminTester = (user.email || '').toLowerCase() === 'lindsey@letsclink.com';
      if (process.env.NODE_ENV === 'development' || isAdminTester) {
        console.log('🧪 Development mode - using mock payment');
        const mockResult = await mockPayment(amount, user.id);
        
        // Record credit history
        const { error: historyError } = await supabase
          .from('credit_history')
          .insert({
            user_id: user.id,
            credit_type: 'late_submit',
            amount: 1,
            action: 'purchase',
            created_at: new Date().toISOString()
          });

        if (historyError) {
          console.error('Error recording credit history:', historyError);
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
        }

        toast({ 
          title: "Mock Payment successful", 
          description: "You can now submit your late take.",
          variant: "default" 
        });

        return true;
      }

      // Production mode would use real Stripe here
      toast({ 
        title: "Production Mode", 
        description: "Stripe integration not available in this demo.",
        variant: "default" 
      });

      return false;
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
      if (!user) return false;

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