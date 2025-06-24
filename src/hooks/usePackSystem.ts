import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FeaturePack, PackUsage } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const usePackSystem = (userId?: string) => {
  const [packUsage, setPackUsage] = useState<PackUsage>({
    anonymous_uses_remaining: 0,
    delete_uses_remaining: 0,
    boost_uses_remaining: 0,
    history_unlocked: false,
    extra_takes_remaining: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPackUsage = async () => {
    if (!userId) return;
    
    try {
      const { data: credits, error } = await supabase
        .from('user_credits')
        .select('credit_type, balance')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching credits:', error);
        return;
      }

      const newPackUsage = {
        anonymous_uses_remaining: 0,
        delete_uses_remaining: 0,
        boost_uses_remaining: 0,
        history_unlocked: false,
        extra_takes_remaining: 0
      };

      credits?.forEach(credit => {
        switch (credit.credit_type) {
          case 'anonymous':
            newPackUsage.anonymous_uses_remaining = credit.balance;
            break;
          case 'delete':
            newPackUsage.delete_uses_remaining = credit.balance;
            break;
          case 'boost':
            newPackUsage.boost_uses_remaining = credit.balance;
            break;
          case 'extra_takes':
            newPackUsage.extra_takes_remaining = credit.balance;
            break;
        }
      });

      setPackUsage(newPackUsage);
    } catch (error) {
      console.error('Error fetching pack usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const consumeUse = async (type: keyof PackUsage) => {
    if (!userId) return false;
    
    const currentUses = packUsage[type];
    if (typeof currentUses === 'number' && currentUses <= 0) {
      return false;
    }

    try {
      let creditType = '';
      switch (type) {
        case 'anonymous_uses_remaining':
          creditType = 'anonymous';
          break;
        case 'delete_uses_remaining':
          creditType = 'delete';
          break;
        case 'boost_uses_remaining':
          creditType = 'boost';
          break;
        case 'extra_takes_remaining':
          creditType = 'extra_takes';
          break;
        default:
          return false;
      }

      const { error } = await supabase
        .from('user_credits')
        .update({ balance: currentUses - 1 })
        .eq('user_id', userId)
        .eq('credit_type', creditType);

      if (error) throw error;

      setPackUsage(prev => ({
        ...prev,
        [type]: typeof currentUses === 'number' ? currentUses - 1 : currentUses
      }));
      
      return true;
    } catch (error) {
      console.error('Error consuming use:', error);
      return false;
    }
  };

  const grantPack = async (type: string, uses: number) => {
    if (!userId) return false;

    try {
      let creditType = '';
      switch (type) {
        case 'anonymous':
          creditType = 'anonymous';
          break;
        case 'delete':
          creditType = 'delete';
          break;
        case 'boost':
          creditType = 'boost';
          break;
        case 'extra_takes':
          creditType = 'extra_takes';
          break;
        default:
          return false;
      }

      const { error } = await supabase
        .from('user_credits')
        .upsert({
          user_id: userId,
          credit_type: creditType,
          balance: uses,
          created_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,credit_type'
        });

      if (error) throw error;
      
      await fetchPackUsage();
      return true;
    } catch (error) {
      console.error('Error granting pack:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchPackUsage();
  }, [userId]);

  return {
    packUsage,
    loading,
    consumeUse,
    grantPack,
    refetch: fetchPackUsage
  };
};