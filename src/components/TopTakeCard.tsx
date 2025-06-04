import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { CommentSection } from './CommentSection';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

interface TopTakeCardProps {
  take: {
    id: string;
    content: string;
    username?: string;
    userId: string;
    reactions: any;
    timestamp: string;
    isPrivate?: boolean;
  };
  onReact?: (takeId: string, reaction: string) => void;
}

export const TopTakeCard: React.FC<TopTakeCardProps> = ({ take, onReact }) => {
  const { user } = useAppContext();
  const [showComments, setShowComments] = useState(false);
  const { toast } = useToast();

  const handleReaction = (reaction: string) => {
    if (!user?.hasPostedToday) {
      toast({ title: "🔒 Post today's take first to react!", variant: "destructive" });
      return;
    }
    if (onReact) {
      onReact(take.id, reaction);
      toast({ title: `Reacted!`, duration: 1000 });
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

  const getTotalReactions = (reactions: any) => {
    if (!reactions || typeof reactions !== 'object') return 0;
    return Object.values(reactions).reduce((sum: number, count: any) => {
      const numCount = typeof count === 'number' ? count : 0;
      return sum + numCount;
    }, 0);
  };

  // Safe username handling with null check
  const safeUsername = take.username || take.userId || 'Anonymous';
  const userInitial = safeUsername && typeof safeUsername === 'string' 
    ? safeUsername.substring(0, 1).toUpperCase() 
    : 'A';

  return (
    <>
      <Card className="bg-gray-800/90 border-gray-700 hover:border-purple-500/50 transition-all duration-200">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start space-x-3">
            <Avatar className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0">
              <AvatarFallback className="bg-purple-600 text-white text-sm">
                {userInitial}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <span className="font-medium text-white text-sm sm:text-base truncate">
                    {safeUsername}
                  </span>
                  {take.isPrivate && (
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400 text-xs px-1">
                      🔒
                    </Badge>
                  )}
                </div>
                <Badge className="bg-purple-600 text-white text-xs px-2 py-1 flex-shrink-0">
                  🔥 {getTotalReactions(take.reactions)}
                </Badge>
              </div>
              
              <p className="text-gray-200 mb-3 leading-relaxed text-sm sm:text-base break-words">{take.content}</p>
              
              {/* Mobile-optimized Reactions */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 sm:gap-2 mb-3">
                {take.reactions && Object.entries(take.reactions).map(([reaction, count]) => (
                  <Button
                    key={reaction}
                    onClick={() => handleReaction(reaction)}
                    variant="outline"
                    size="sm"
                    className="border-gray-600 text-gray-300 hover:border-purple-400 hover:text-purple-400 text-xs px-2 py-1 h-auto justify-start"
                    disabled={!user?.hasPostedToday}
                  >
                    <span className="mr-1">{getReactionEmoji(reaction)}</span>
                    {(count || 0) > 0 && <span className="font-bold">{count}</span>}
                  </Button>
                ))}
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => setShowComments(!showComments)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-purple-400 p-1 h-auto text-xs"
                  disabled={!user?.hasPostedToday}
                >
                  <MessageCircle className="w-3 h-3 mr-1" />
                  {user?.hasPostedToday ? 'Comments' : '🔒'}
                </Button>
                
                <div className="flex items-center space-x-1">
                  <Button
                    onClick={() => handleReaction('wildTake')}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-red-400 p-1 h-auto"
                    disabled={!user?.hasPostedToday}
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => handleReaction('mid')}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-yellow-400 p-1 h-auto"
                    disabled={!user?.hasPostedToday}
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <CommentSection 
        takeId={take.id} 
        isOpen={showComments && !!user?.hasPostedToday}
        onClose={() => setShowComments(false)}
      />
    </>
  );
};