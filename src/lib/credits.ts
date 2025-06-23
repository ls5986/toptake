import { useAppContext } from '@/contexts/AppContext';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export type CreditType = 'anonymous' | 'late_submit' | 'sneak_peek' | 'boost' | 'extra_takes' | 'delete';
export type CreditAction = 'purchase' | 'use' | 'expire' | 'refund';

interface CreditHistory {
  id: string;
  user_id: string;
  credit_type: CreditType;
  amount: number;
  action: CreditAction;
  description: string | null;
  created_at: string;
  expires_at: string | null;
  related_purchase_id: string | null;
}

interface CreditPurchase {
  id: string;
  user_id: string;
  credit_type: CreditType;
  amount: number;
  price: number;
  stripe_payment_id: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  expires_at: string | null;
}

export const useCredits = () => {
  const { userCredits, refreshUserCredits } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const useCredit = async (
    type: CreditType,
    amount: number = 1,
    description?: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if user has enough credits
      if (userCredits[type] < amount) {
        return false;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Start a transaction
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ [type]: userCredits[type] - amount })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Record credit usage in history
      await supabase.rpc('add_credit_history', {
        p_user_id: user.id,
        p_credit_type: type,
        p_amount: amount,
        p_action: 'use',
        p_description: description || `Used ${amount} ${type} credit(s)`
      });

      // Refresh credits in app
      await refreshUserCredits();
      return true;
    } catch (err) {
      console.error('Error using credit:', err);
      setError(err.message || 'Failed to use credit');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const hasEnoughCredits = (type: CreditType, amount: number = 1): boolean => {
    return userCredits[type] >= amount;
  };

  const getCreditHistory = async (
    limit: number = 50,
    offset: number = 0
  ): Promise<CreditHistory[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error: historyError } = await supabase
        .rpc('get_credit_history', {
          p_user_id: user.id,
          p_limit: limit,
          p_offset: offset
        });

      if (historyError) throw historyError;
      return data || [];
    } catch (err) {
      console.error('Error fetching credit history:', err);
      setError(err.message || 'Failed to fetch credit history');
      return [];
    }
  };

  const getCreditPurchases = async (): Promise<CreditPurchase[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error: purchasesError } = await supabase
        .from('credit_purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (purchasesError) throw purchasesError;
      return data || [];
    } catch (err) {
      console.error('Error fetching credit purchases:', err);
      setError(err.message || 'Failed to fetch credit purchases');
      return [];
    }
  };

  const checkExpiredCredits = async (): Promise<void> => {
    try {
      const { error: checkError } = await supabase
        .rpc('check_expired_credits');

      if (checkError) throw checkError;
      await refreshUserCredits();
    } catch (err) {
      console.error('Error checking expired credits:', err);
      setError(err.message || 'Failed to check expired credits');
    }
  };

  return {
    useCredit,
    hasEnoughCredits,
    getCreditHistory,
    getCreditPurchases,
    checkExpiredCredits,
    credits: userCredits,
    isLoading,
    error
  };
};

export async function getUserCredits(userId: string, creditType: CreditType): Promise<number> {
  const { data, error } = await supabase
    .from('user_credits')
    .select('balance')
    .eq('user_id', userId)
    .eq('credit_type', creditType)
    .single();
  if (error || !data) return 0;
  return data.balance;
}

export async function updateUserCredits(userId: string, creditType: CreditType, newBalance: number): Promise<boolean> {
  const { error } = await supabase
    .from('user_credits')
    .upsert({ user_id: userId, credit_type: creditType, balance: newBalance });
  return !error;
}

export async function spendCredits(userId: string, creditType: CreditType, amount: number): Promise<boolean> {
  const current = await getUserCredits(userId, creditType);
  if (current < amount) return false;
  return await updateUserCredits(userId, creditType, current - amount);
}

export async function addCredits(userId: string, creditType: CreditType, amount: number): Promise<boolean> {
  const current = await getUserCredits(userId, creditType);
  return await updateUserCredits(userId, creditType, current + amount);
} 