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

      // Spend via RPC (atomic)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      const { data, error: rpcErr } = await supabase.rpc('spend_credit', {
        p_user: user.id,
        p_type: type,
        p_amount: amount,
        p_reason: description || null
      });
      if (rpcErr) throw rpcErr;
      const ok = data === true;
      await refreshUserCredits();
      return ok;
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
        .from('credit_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

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
        .from('purchases')
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
    .from('user_credits_balances')
    .select('balance')
    .eq('user_id', userId)
    .eq('credit_type', creditType)
    .single();
  if (error || !data) return 0;
  return data.balance;
}

export async function updateUserCredits(userId: string, creditType: CreditType, newBalance: number): Promise<boolean> {
  const { error } = await supabase
    .from('user_credits_balances')
    .upsert({ user_id: userId, credit_type: creditType, balance: newBalance });
  return !error;
}

export async function spendCredits(userId: string, creditType: CreditType, amount: number): Promise<boolean> {
  // Deprecated: kept for backward compatibility; use spendCreditRPC via useCredits/useCredit.
  const { data, error } = await supabase.rpc('spend_credit', {
    p_user: userId,
    p_type: creditType,
    p_amount: amount,
    p_reason: null
  });
  return !error && data === true;
}

export async function addCredits(userId: string, creditType: CreditType, amount: number): Promise<boolean> {
  const current = await getUserCredits(userId, creditType);
  return await updateUserCredits(userId, creditType, current + amount);
} 