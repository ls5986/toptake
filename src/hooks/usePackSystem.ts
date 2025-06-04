import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FeaturePack, PackUsage } from '@/types';
import { useToast } from '@/hooks/use-toast';

export const usePackSystem = (userId?: string) => {
  const [packUsage, setPackUsage] = useState<PackUsage>({
    anonymous_uses_remaining: 1,
    delete_uses_remaining: 2,
    boost_uses_remaining: 0,
    history_unlocked: false,
    extra_takes_remaining: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPackUsage = async () => {
    if (!userId) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('anonymous_uses_remaining, delete_uses_remaining, boost_uses_remaining, history_unlocked, extra_takes_remaining')
        .eq('id', userId)
        .single();

      if (error) throw error;
      if (profile) {
        setPackUsage({
          anonymous_uses_remaining: profile.anonymous_uses_remaining || 1,
          delete_uses_remaining: profile.delete_uses_remaining || 2,
          boost_uses_remaining: profile.boost_uses_remaining || 0,
          history_unlocked: profile.history_unlocked || false,
          extra_takes_remaining: profile.extra_takes_remaining || 0
        });
      }
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
      const updates: any = {};
      if (typeof currentUses === 'number') {
        updates[type] = currentUses - 1;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

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
      const { error } = await supabase
        .from('feature_packs')
        .insert({
          user_id: userId,
          type,
          uses_granted: uses,
          uses_remaining: uses
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