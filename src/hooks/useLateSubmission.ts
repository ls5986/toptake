import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

export const useLateSubmission = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const processLateSubmission = async (promptDate: string, amount: number, promoCode?: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Real Stripe flow: create a checkout for late submission credit
      const backendUrl = (import.meta as any)?.env?.VITE_BACKEND_URL || 'https://toptake.onrender.com';
      const resp = await fetch(`${backendUrl}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lookupKey: 'credits_late_submit_5_199',
          userId: user.id,
          mode: 'payment',
          promoCode: promoCode,
          metadata: { late_submit_for: promptDate }
        })
      });
      if (!resp.ok) throw new Error('Failed to create checkout session');
      const body = await resp.json();
      if (body.free) {
        toast({ title: 'Late submit unlocked', description: promoCode ? `Promo ${promoCode} applied.` : 'Promo applied.' });
        return true;
      }
      try { localStorage.setItem('pendingLateSubmitFor', promptDate); localStorage.setItem('pendingLateSubmitTS', String(Date.now())); } catch {}
      window.location.href = body.url;
      return true;
    } catch (err) {
      console.error('Late submission error:', err);
      setError((err as any)?.message);
      toast({ 
        title: "Payment failed", 
        description: (err as any)?.message,
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
      setError((err as any)?.message);
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