import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Heart, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import { Take } from '@/types';
import { CommentSection } from './CommentSection';
import { PromptDisplay } from './PromptDisplay';
import { PackUpgradeModal } from './PackUpgradeModal';
import { useAppContext } from '@/contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { usePackSystem } from '@/hooks/usePackSystem';
import ProfileView from './ProfileView';
import { supabase, addNotification } from '@/lib/supabase';
import { ReactionType } from '@/lib/reactions';
import { logClientEvent } from '@/lib/utils';
import { getThemeColors, deriveThemeSurfaces } from '@/lib/themes';
import { useTheme } from '@/components/theme-provider';

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
  const navigate = useNavigate();
  const { packUsage, consumeUse } = usePackSystem(user?.id);
  const [showComments, setShowComments] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<'delete' | null>(null);
  const { toast } = useToast();
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [reactionTypes, setReactionTypes] = useState<{ name: string; emoji: string }[]>([]);
  const { theme } = useTheme();
  const surfaces = (() => {
    try { return deriveThemeSurfaces(getThemeColors(theme)); } catch { return null as any; }
  })();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

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

  // Fetch avatar if not anonymous
  useEffect(() => {
    (async () => {
      try {
        if (!take?.userId || take.isAnonymous) { setAvatarUrl(null); return; }
        const { data } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', take.userId)
          .maybeSingle();
        setAvatarUrl((data as any)?.avatar_url || null);
      } catch {}
    })();
  }, [take?.userId, take?.isAnonymous]);

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
        await addNotification(
          take.userId,
          'reaction',
          `${user.username || 'Someone'} reacted to your take`,
          {
            actorId: user.id,
            takeId: take.id,
            title: 'New reaction',
            extra: { reaction }
          }
        );
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

  const handleProfileClick = async () => {
    if (take.isAnonymous) return;
    let username = (take.username || '').toString().trim();
    if (!username || username.toLowerCase() === 'unknown') {
      try {
        const { data } = await supabase.from('profiles').select('username').eq('id', take.userId).maybeSingle();
        if (data?.username) username = data.username;
      } catch {}
    }
    if (username) {
      try { logClientEvent('profile_click', { username, takeId: take.id }); } catch {}
      navigate(`/${encodeURIComponent(username)}`);
    }
  };

  const handleShareTake = async () => {
    // Canonical share url: /:username/:date/:takeId
    const date = (take as any).prompt_date || new Date(take.timestamp).toISOString().slice(0,10);
    const username = take.username || 'user';
    const url = `${window.location.origin}/${username}/${date}/${take.id}`;
    // Compose share text with prompt snippet when available
    let promptSnippet = '';
    try {
      const { data: p } = await supabase
        .from('daily_prompts')
        .select('prompt_text')
        .eq('prompt_date', String((take as any).prompt_date || '').slice(0,10))
        .maybeSingle();
      if (p?.prompt_text) {
        promptSnippet = `\nPrompt: ${p.prompt_text}`;
      }
    } catch {}
    try { logClientEvent('share_take', { takeId: take.id, username, date, url }); } catch {}
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'TopTake', text: `"${take.content}"${promptSnippet}`, url });
      } else {
        await navigator.clipboard.writeText(`"${take.content}"${promptSnippet}\n${url}`);
        toast({ title: 'Link copied', description: 'Share it anywhere!' });
      }
    } catch {}
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
  const safeUsername = (() => {
    if (take.isAnonymous) return 'Anonymous';
    if (take.username && take.username.toLowerCase() !== 'unknown') return take.username;
    if (user?.id && take.userId === user.id) return 'You';
    return 'user';
  })();
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

  // Format the prompt date if available on the take
  const promptDateLabel = (() => {
    const raw = (take as any).prompt_date || (take as any).promptDate;
    if (!raw) return null;
    const s = String(raw);
    // If it's an ISO date-only string, format without constructing a Date (avoids UTC shifting)
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      return `${mo}/${d}/${y}`;
    }
    try {
      const date = new Date(s);
      if (!Number.isNaN(date.getTime())) return date.toLocaleDateString();
    } catch {}
    return s;
  })();

  return (
    <>
      <div className="space-y-3">
        {showPrompt && promptText && (
          <PromptDisplay 
            prompt={promptText} 
            dayNumber={dayNumber} 
          />
        )}
        
        <Card className="transition-all duration-200" style={{ background: surfaces?.surface || undefined, borderColor: surfaces?.border || undefined, borderWidth: 1 }}>
          <CardContent className="p-3 sm:p-3.5">
            <div className="flex items-start space-x-3">
              <Avatar 
                className={`w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 ${!take.isAnonymous ? 'cursor-pointer hover:ring-2 hover:ring-brand-accent' : ''}`}
                onClick={handleProfileClick}
              >
                {!take.isAnonymous && avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={safeUsername} />
                ) : (
                  <AvatarFallback className="bg-brand-accent text-brand-text text-sm">
                    {userInitial}
                  </AvatarFallback>
                )}
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
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
                    {promptDateLabel && (
                      <span className="text-brand-muted text-xs">• For {promptDateLabel}</span>
                    )}
                    {take.is_late_submit && (
                      <Badge className="bg-yellow-400 text-yellow-900 text-xs px-2 py-1 flex-shrink-0 ml-2" title="Late Submit">
                        ⏰ Late Submit
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleShareTake}
                      className="text-xs text-brand-muted hover:text-brand-accent underline-offset-2"
                      title="Share take"
                    >
                      Share
                    </button>
                    <div className="inline-block px-1.5 py-0.5 rounded bg-brand-surface/60 text-brand-accent text-xs font-semibold border border-brand-accent/80">
                      🔥 {engagementCount}
                    </div>
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
                
                <p className="text-brand-text/90 mb-2 leading-snug text-sm sm:text-[15px] break-words">{take.content}</p>
                
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 mb-2">
                  {reactionTypes.map(rt => (
                    <Button
                      key={rt.name}
                      onClick={() => handleReaction(rt.name)}
                      variant={userReaction === rt.name ? "solid" : "outline"}
                      size="sm"
                      className={`border-brand-border/70 text-brand-text hover:border-brand-accent hover:text-brand-accent text-xs px-2 py-1 h-auto min-h-[26px] justify-start ${userReaction === rt.name ? 'bg-brand-accent text-white' : ''}`}
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
      
      {/* profile modal removed in favor of username routes */}
      
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