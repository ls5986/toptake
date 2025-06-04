import React, { useState } from 'react';
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

interface TakeCardProps {
  take: Take;
  onReact: (takeId: string, reaction: keyof Take['reactions']) => void;
  onDelete?: (takeId: string) => void;
  showPrompt?: boolean;
  promptText?: string;
  dayNumber?: number;
  isOwnTake?: boolean;
}

export const TakeCard: React.FC<TakeCardProps> = ({ 
  take, 
  onReact, 
  onDelete,
  showPrompt = false, 
  promptText = '', 
  dayNumber = 1,
  isOwnTake = false
}) => {
  const { user, hasPostedToday } = useAppContext();
  const { packUsage, consumeUse } = usePackSystem(user?.id);
  const [showComments, setShowComments] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<'delete' | null>(null);
  const { toast } = useToast();

  const canInteract = hasPostedToday || user?.hasPostedToday;

  const handleReaction = (reaction: keyof Take['reactions']) => {
    if (!canInteract) {
      toast({ title: "🔒 Post today's take first to react!", variant: "destructive" });
      return;
    }
    onReact(take.id, reaction);
    toast({ title: `Reacted with ${getReactionEmoji(reaction)}!`, duration: 1000 });
  };

  const handleDelete = async () => {
    if (!isOwnTake || !onDelete) return;
    
    if (packUsage.delete_uses_remaining <= 0) {
      setShowUpgradeModal('delete');
      return;
    }

    const success = await consumeUse('delete_uses_remaining');
    if (success) {
      onDelete(take.id);
      toast({ title: "Take deleted", description: `${packUsage.delete_uses_remaining - 1} deletes remaining` });
    }
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

  return (
    <>
      <div className="space-y-3">
        {showPrompt && promptText && (
          <PromptDisplay 
            prompt={promptText} 
            dayNumber={dayNumber} 
          />
        )}
        
        <Card className="bg-gray-800/90 border-gray-700 hover:border-purple-500/50 transition-all duration-200 backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start space-x-3">
              <Avatar 
                className={`w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 ${!take.isAnonymous ? 'cursor-pointer hover:ring-2 hover:ring-purple-400' : ''}`}
                onClick={handleProfileClick}
              >
                <AvatarFallback className="bg-purple-600 text-white text-sm">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span 
                      className={`font-medium text-white text-sm sm:text-base truncate ${
                        !take.isAnonymous ? 'cursor-pointer hover:text-purple-400' : ''
                      }`}
                      onClick={handleProfileClick}
                    >
                      {take.isAnonymous ? 'Anonymous' : safeUsername}
                    </span>
                    {take.isAnonymous && (
                      <Badge variant="outline" className="text-purple-400 border-purple-400 text-xs px-1 py-0">
                        👻
                      </Badge>
                    )}
                    <span className="text-gray-400 text-xs">{formatTimestamp(take.timestamp)}</span>
                  </div>
                  
                  {isOwnTake && onDelete && (
                    <Button
                      onClick={handleDelete}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-400 p-1 h-auto"
                      title={packUsage.delete_uses_remaining > 0 ? `Delete (${packUsage.delete_uses_remaining} left)` : 'Delete (upgrade needed)'}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
                
                <p className="text-gray-200 mb-3 leading-relaxed text-sm sm:text-base break-words">{take.content}</p>
                
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 sm:gap-2 mb-3">
                  {Object.entries(take.reactions).map(([reaction, count]) => (
                    <Button
                      key={reaction}
                      onClick={() => handleReaction(reaction as keyof Take['reactions'])}
                      variant="outline"
                      size="sm"
                      className="border-gray-600 text-gray-300 hover:border-purple-400 hover:text-purple-400 text-xs px-2 py-1 h-auto min-h-[28px] justify-start"
                      disabled={!canInteract}
                    >
                      <span className="mr-1">{getReactionEmoji(reaction)}</span>
                      <span className="truncate">{getReactionLabel(reaction)}</span>
                      {count > 0 && <span className="ml-1 font-bold">{count}</span>}
                    </Button>
                  ))}
                </div>
                
                <div className="flex items-center justify-between text-gray-400">
                  <Button
                    onClick={() => setShowComments(!showComments)}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-purple-400 p-1 h-auto text-xs"
                    disabled={!canInteract}
                  >
                    <MessageCircle className="w-3 h-3 mr-1" />
                    {canInteract ? 'Comments' : '🔒'}
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      onClick={() => handleReaction('wildTake')}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-red-400 p-1 h-auto"
                      disabled={!canInteract}
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => handleReaction('mid')}
                      variant="ghost"
                      size="sm"
                      className="text-gray-400 hover:text-yellow-400 p-1 h-auto"
                      disabled={!canInteract}
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <CommentSection 
        takeId={take.id} 
        isOpen={showComments && canInteract}
        onClose={() => setShowComments(false)}
      />
      
      {showProfile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Profile</h2>
                <Button 
                  onClick={() => setShowProfile(false)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white p-1"
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