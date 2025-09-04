import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Heart, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import { Take } from '@/types';
import { CommentSection } from './CommentSection';
import { PromptDisplay } from './PromptDisplay';
import { PackUpgradeModal } from './PackUpgradeModal';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { usePackSystem } from '@/hooks/usePackSystem';
import ProfileView from './ProfileView';
import { supabase, addNotification } from '@/lib/supabase';
import { ReactionType } from '@/lib/reactions';

interface TakeCardProps {
  take: Take;
  onReact: (takeId: string, reaction: ReactionType) => void;
  onDelete?: (takeId: string) => void;
  showPrompt?: boolean;
  promptText?: string;
  dayNumber?: number;
  isOwnTake?: boolean;
  selectedDate?: string;
  reactionCounts?: Record<ReactionType, number>;
}

export const TakeCard: React.FC<TakeCardProps> = ({ 
  take, 
  onReact, 
  onDelete,
  showPrompt = false, 
  promptText = '', 
  dayNumber = 1,
  isOwnTake = false,
  selectedDate,
  reactionCounts = { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 }
}) => {
  const { user, hasPostedToday } = useAppContext();
  const { packUsage, consumeUse } = usePackSystem(user?.id);
  const [showComments, setShowComments] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<'delete' | null>(null);
  const { toast } = useToast();
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [reactionTypes, setReactionTypes] = useState<{ name: string; emoji: string }[]>([]);

  const canInteract = hasPostedToday || user?.hasPostedToday;

  useEffect(() => {
    // Fetch all reaction types
    const fetchReactionTypes = async () => {
      // Use hardcoded reaction types since the table doesn't exist
      const hardcodedReactionTypes = [
        { name: 'wildTake', emoji: '🚨' },
        { name: 'fairPoint', emoji: '⚖️' },
        { name: 'mid', emoji: '🙄' },
        { name: 'thatYou', emoji: '👻' }
      ];
      setReactionTypes(hardcodedReactionTypes);
    };
    fetchReactionTypes();
  }, []);

  useEffect(() => {
    // Fetch reactions for this take
    const fetchReactions = async () => {
      const { data } = await supabase
        .from('take_reactions')
        .select('reaction_type, actor_id')
        .eq('take_id', take.id);
      const counts: { [key: string]: number } = {};
      let userReact: string | null = null;
      (data || []).forEach((r: any) => {
        counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
        if (r.actor_id === user?.id) userReact = r.reaction_type;
      });
      setUserReaction(userReact);
    };
    if (take.id && user?.id) fetchReactions();
  }, [take.id, user?.id]);

  const handleReaction = async (reaction: string) => {
    if (!canInteract) {
      toast({ title: "🔒 Post today's take first to react!", variant: "destructive" });
      return;
    }
    // Upsert user's reaction
    await supabase.from('take_reactions').upsert({
      take_id: take.id,
      actor_id: user.id,
      reaction_type: reaction,
      created_at: new Date().toISOString(),
    });
    setUserReaction(reaction);
    toast({ title: `Reacted with ${getReactionEmoji(reaction)}!`, duration: 1000 });
    // Notify take owner (if not self)
    try {
      if (take.userId && user?.id && take.userId !== user.id) {
        await addNotification(take.userId, 'reaction', `${user.username || 'Someone'} reacted to your take.`);
      }
    } catch {}
    // Optionally, refetch reactions
    const { data } = await supabase
      .from('take_reactions')
      .select('reaction_type, actor_id')
      .eq('take_id', take.id);
    const counts: { [key: string]: number } = {};
    (data || []).forEach((r: any) => {
      counts[r.reaction_type] = (counts[r.reaction_type] || 0) + 1;
    });
  };

  const handleDelete = async () => {
    if (!isOwnTake || !onDelete) return;
    
    // Simple delete without pack usage check
    onDelete(take.id);
    toast({ title: "Take deleted", description: "Take has been removed" });
  };

  const handleUpgrade = (type: string, uses: number) => {
    toast({ title: "Pack purchased!", description: `Added ${uses} ${type} uses` });
  };

  const handleProfileClick = () => {
    if (!take.isAnonymous) {
      setShowProfile(true);
    }
  };

  const getReactionEmoji = (reaction: string) => {
    switch (reaction) {
      case 'wildTake': return '🚨';
      case 'fairPoint': return '⚖️';
      case 'mid': return '🙄';
      case 'thatYou': return '👻';
      default: return '👍';
    }
  };

  const getReactionLabel = (reaction: string) => {
    switch (reaction) {
      case 'wildTake': return 'Wild';
      case 'fairPoint': return 'Fair';
      case 'mid': return 'Mid';
      case 'thatYou': return 'That You?';
      default: return reaction;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        return diffInMinutes < 1 ? 'now' : `${diffInMinutes}m`;
      } else if (diffInHours < 24) {
        return `${diffInHours}h`;
      } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays}d`;
      }
    } catch {
      return 'now';
    }
  };

  // Fixed null safety for username and charAt
  const safeUsername = take.username || take.userId || 'Anonymous';
  const userInitial = take.isAnonymous 
    ? '👻' 
    : (safeUsername && typeof safeUsername === 'string' && safeUsername.length > 0
        ? safeUsername.charAt(0).toUpperCase() 
        : 'A');

  // Helper to show comment count (flat for now, can be improved to count nested)
  const commentCount = take.commentCount || 0;

  // Engagement = sum of all reactions + commentCount
  // Prefer server-provided counts if available, fallback to client counts
  const serverReaction = (take as any).reactionCount ?? 0;
  const engagementCount = (serverReaction || Object.values(reactionCounts || {}).reduce((sum, count) => sum + count, 0)) + (take.commentCount || 0);

  return (
    <>
      <div className="space-y-3">
        {showPrompt && promptText && (
          <PromptDisplay 
            prompt={promptText} 
            dayNumber={dayNumber} 
          />
        )}
        
        <Card className="bg-brand-surface/90 border-brand-border hover:border-brand-accent transition-all duration-200 backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start space-x-3">
              <Avatar 
                className={`w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 ${!take.isAnonymous ? 'cursor-pointer hover:ring-2 hover:ring-brand-accent' : ''}`}
                onClick={handleProfileClick}
              >
                <AvatarFallback className="bg-brand-accent text-brand-text text-sm">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span 
                      className={`font-medium text-brand-text text-sm sm:text-base truncate ${
                        !take.isAnonymous ? 'cursor-pointer hover:text-brand-accent' : ''
                      }`}
                      onClick={handleProfileClick}
                    >
                      {take.isAnonymous ? 'Anonymous' : safeUsername}
                    </span>
                    {take.isAnonymous && (
                      <Badge variant="outline" className="text-brand-accent border-brand-accent text-xs px-1 py-0">
                        👻
                      </Badge>
                    )}
                    <span className="text-brand-muted text-xs">{formatTimestamp(take.timestamp)}</span>
                    {take.is_late_submit && (
                      <Badge className="bg-yellow-400 text-yellow-900 text-xs px-2 py-1 flex-shrink-0 ml-2" title="Late Submit">
                        ⏰ Late Submit
                      </Badge>
                    )}
                  </div>
                  <div className="inline-block px-2 py-1 rounded bg-brand-surface text-brand-accent text-xs font-semibold border border-brand-accent">
                    🔥 {engagementCount}
                  </div>
                  
                  {isOwnTake && onDelete && (
                    <Button
                      onClick={handleDelete}
                      variant="ghost"
                      size="sm"
                      className="text-brand-muted hover:text-brand-danger p-1 h-auto"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                <p className="text-brand-muted mb-3 leading-relaxed text-sm sm:text-base break-words">{take.content}</p>
                
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 sm:gap-2 mb-3">
                  {reactionTypes.map(rt => (
                    <Button
                      key={rt.name}
                      onClick={() => handleReaction(rt.name)}
                      variant={userReaction === rt.name ? "solid" : "outline"}
                      size="sm"
                      className={`border-brand-border text-brand-text hover:border-brand-accent hover:text-brand-accent text-xs px-2 py-1 h-auto min-h-[28px] justify-start ${userReaction === rt.name ? 'bg-brand-accent text-white' : ''}`}
                      disabled={!canInteract}
                    >
                      <span className="mr-1">{rt.emoji}</span>
                      <span className="truncate">{getReactionLabel(rt.name)}</span>
                      {reactionCounts[rt.name as ReactionType] > 0 && <span className="ml-1 font-bold">{reactionCounts[rt.name as ReactionType]}</span>}
                    </Button>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-brand-muted">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center text-xs hover:text-brand-accent"
                    onClick={() => setShowComments(true)}
                  >
                    <span className="mr-1"><MessageCircle className="w-4 h-4" /></span>
                    Comments{commentCount > 0 ? ` (${commentCount})` : ''}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {showComments && (
        <CommentSection takeId={take.id} isOpen={showComments} onClose={() => setShowComments(false)} selectedDate={selectedDate} />
      )}
      
      {showProfile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-brand-surface rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-brand-text">Profile</h2>
                <Button 
                  onClick={() => setShowProfile(false)}
                  variant="ghost"
                  size="sm"
                  className="text-brand-muted hover:text-brand-text p-1"
                >
                  ✕
                </Button>
              </div>
              <ProfileView username={take.username} />
            </div>
          </div>
        </div>
      )}
      
      {showUpgradeModal && (
        <PackUpgradeModal
          isOpen={true}
          onClose={() => setShowUpgradeModal(null)}
          packType={showUpgradeModal}
          onPurchase={handleUpgrade}
        />
      )}
    </>
  );
};