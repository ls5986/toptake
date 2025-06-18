import { supabase } from '@/lib/supabase';

export type ReactionType = 'wildTake' | 'fairPoint' | 'mid' | 'thatYou';

export async function getReactionCounts(takeId: string): Promise<Record<ReactionType, number>> {
  const { data, error } = await supabase
    .from('take_reactions')
    .select('reaction_type')
    .eq('take_id', takeId);

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
  return supabase.from('take_reactions').insert({
    take_id: takeId,
    user_id: userId,
    reaction_type: reactionType,
    created_at: new Date().toISOString(),
  });
}

export async function removeReaction(takeId: string, userId: string, reactionType: ReactionType) {
  return supabase.from('take_reactions')
    .delete()
    .eq('take_id', takeId)
    .eq('user_id', userId)
    .eq('reaction_type', reactionType);
} 