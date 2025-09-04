import { supabase } from '@/lib/supabase';

export type ReactionType = 'wildTake' | 'fairPoint' | 'mid' | 'thatYou';

export async function getReactionCounts(takeId: string): Promise<Record<ReactionType, number>> {
  console.log('[reactions] getReactionCounts →', { takeId });
  const { data, error } = await supabase
    .from('take_reactions')
    .select('reaction_type')
    .eq('take_id', takeId);
  if (error) {
    console.error('[reactions] getReactionCounts error:', error);
  } else {
    console.log('[reactions] getReactionCounts data:', data?.length);
  }

  const counts: Record<ReactionType, number> = {
    wildTake: 0,
    fairPoint: 0,
    mid: 0,
    thatYou: 0,
  };
  if (data) {
    data.forEach((r) => {
      if (counts[r.reaction_type as ReactionType] !== undefined) {
        counts[r.reaction_type as ReactionType]++;
      }
    });
  }
  return counts;
}

export async function addReaction(takeId: string, userId: string, reactionType: ReactionType) {
  // Standardize on actor_id to match DB schema and other callers
  console.log('[reactions] addReaction →', { takeId, userId, reactionType });
  const { error } = await supabase.from('take_reactions').upsert({
    take_id: takeId,
    actor_id: userId,
    reaction_type: reactionType,
    created_at: new Date().toISOString(),
  }, { onConflict: 'take_id,actor_id,reaction_type' });
  if (error) {
    console.error('[reactions] addReaction error:', error);
    return { error };
  }
  try {
    // Fetch take owner and notify
    const { data: take } = await supabase.from('takes').select('user_id').eq('id', takeId).single();
    if (take && take.user_id !== userId) {
      await supabase.from('notifications').insert({
        user_id: take.user_id,
        type: 'reaction',
        message: 'Someone reacted to your take',
        actor_id: userId,
        created_at: new Date().toISOString(),
        read: false,
      });
    }
  } catch (notifyErr) {
    console.warn('[reactions] notify error:', notifyErr);
  }
  return { error: null };
}

export async function removeReaction(takeId: string, userId: string, reactionType: ReactionType) {
  console.log('[reactions] removeReaction →', { takeId, userId, reactionType });
  return supabase.from('take_reactions')
    .delete()
    .eq('take_id', takeId)
    .eq('actor_id', userId)
    .eq('reaction_type', reactionType);
}