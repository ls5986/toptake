import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase, addNotification } from '@/lib/supabase';
import CommentThread, { Comment as CommentType } from './CommentThread';

interface Comment {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  username: string;
  take_id: string;
}

interface RawComment {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  username?: string;
  take_id: string;
  parent_comment_id?: string | null;
  profiles?: { username?: string };
}

interface CommentSectionProps {
  takeId: string;
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
}

export const CommentSection = ({ takeId, isOpen, onClose, selectedDate }: CommentSectionProps) => {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const { toast } = useToast();
  const [votes, setVotes] = useState<Record<string, { like: number; dislike: number; userVote?: 'like' | 'dislike' }>>({});
  const [refresh, setRefresh] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (isOpen && takeId) {
      loadComments();
    }
  }, [isOpen, takeId, refresh]);

  // Helper to build a tree of comments
  const buildCommentTree = (flatComments: CommentType[]): CommentType[] => {
    const map: Record<string, CommentType & { replies: CommentType[] }> = {};
    const roots: (CommentType & { replies: CommentType[] })[] = [];
    flatComments.forEach((c) => {
      map[c.id] = { ...c, replies: [] };
    });
    flatComments.forEach((c) => {
      if (c.parent_comment_id) {
        map[c.parent_comment_id]?.replies.push(map[c.id]);
      } else {
        roots.push(map[c.id]);
      }
    });
    return roots;
  };

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      // Use the new function to fetch comments with like/dislike counts and usernames
      const { data, error } = await supabase
        .rpc('get_comments_with_votes', { take_id: takeId });
      if (error) throw error;
      // Map to CommentType and build votes map
      const formatted: CommentType[] = (data || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        is_anonymous: c.is_anonymous,
        created_at: c.created_at,
        user_id: c.user_id,
        parent_comment_id: c.parent_comment_id,
        username: c.username || 'User',
      }));
      setComments(formatted);
      // Build votes map
      const voteMap: Record<string, { like: number; dislike: number; userVote?: 'like' | 'dislike' }> = {};
      (data || []).forEach((c: any) => {
        voteMap[c.id] = { like: c.like_count || 0, dislike: c.dislike_count || 0 };
      });
      setVotes(voteMap);
    } catch (error: unknown) {
      console.error('Failed to load comments:', error);
      toast({ 
        title: 'Error loading comments', 
        description: 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setLoadingComments(false);
    }
  };

  // Add a comment or reply
  const handleReply = async (parentId: string | null, content: string, isAnonymous: boolean) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Please log in to comment', variant: 'destructive' });
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      const commentData = {
        content,
        take_id: takeId,
        user_id: user.id,
        is_anonymous: isAnonymous,
        parent_comment_id: parentId,
      };
      const { data: inserted, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single();
      if (error) throw error;
      const displayUsername = isAnonymous ? 'Anonymous' : (profile?.username || 'User');
      const displayComment: CommentType = { ...inserted, username: displayUsername };
      setComments((prev) => [...prev, displayComment]);
      setNewComment('');
      toast({ title: 'Comment posted successfully!', duration: 2000 });
      setRefresh(r => r + 1);
      // Notify take owner (if not self)
      const { data: take } = await supabase.from('takes').select('user_id').eq('id', takeId).single();
      if (take && take.user_id !== user.id) {
        await addNotification(take.user_id, 'comment', `${profile?.username || 'User'} commented on your take: "${content.slice(0, 60)}"`);
      }
    } catch (error: unknown) {
      toast({ title: 'Failed to post comment', description: (error as Error).message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Like/dislike logic
  const handleVote = async (commentId: string, voteType: 'like' | 'dislike' | undefined) => {
    if (!userId) return;
    // Optimistic UI
    setVotes(prev => {
      const prevVote = prev[commentId]?.userVote;
      if (voteType === undefined) {
        // Remove vote
        return {
          ...prev,
          [commentId]: {
            ...prev[commentId],
            like: prevVote === 'like' ? (prev[commentId]?.like || 1) - 1 : prev[commentId]?.like || 0,
            dislike: prevVote === 'dislike' ? (prev[commentId]?.dislike || 1) - 1 : prev[commentId]?.dislike || 0,
            userVote: undefined
          }
        };
      } else {
        // Switch or add vote
        let like = prev[commentId]?.like || 0;
        let dislike = prev[commentId]?.dislike || 0;
        if (voteType === 'like') {
          like = prevVote === 'dislike' ? like + 1 : like + (prevVote === 'like' ? 0 : 1);
          dislike = prevVote === 'dislike' ? dislike - 1 : dislike;
        } else if (voteType === 'dislike') {
          dislike = prevVote === 'like' ? dislike + 1 : dislike + (prevVote === 'dislike' ? 0 : 1);
          like = prevVote === 'like' ? like - 1 : like;
        }
        return {
          ...prev,
          [commentId]: {
            ...prev[commentId],
            like,
            dislike,
            userVote: voteType
          }
        };
      }
    });
    // DB logic
    if (voteType === undefined) {
      // Remove vote
      await supabase.from('comment_votes').delete().eq('comment_id', commentId).eq('user_id', userId);
    } else {
      // Upsert vote
      await supabase.from('comment_votes').upsert({
        comment_id: commentId,
        user_id: userId,
        vote_type: voteType,
        created_at: new Date().toISOString(),
      });
    }
    setRefresh(r => r + 1);
    // Get comment owner
    const { data: comment } = await supabase.from('comments').select('user_id').eq('id', commentId).single();
    if (comment && comment.user_id !== userId && voteType) {
      await addNotification(comment.user_id, 'reaction', `Someone ${voteType === 'like' ? 'liked' : 'disliked'} your comment.`);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  // Build the comment tree for rendering
  const commentTree = buildCommentTree(comments);

  const renderCommentTree = (comment, depth = 0) => (
    <CommentThread
      key={comment.id}
      comment={comment}
      onReply={handleReply}
      onVote={handleVote}
      likeCount={votes[comment.id]?.like || 0}
      dislikeCount={votes[comment.id]?.dislike || 0}
      userVote={votes[comment.id]?.userVote}
      depth={depth}
    >
      {comment.replies && comment.replies.map((reply) => renderCommentTree(reply, depth + 1))}
    </CommentThread>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div className="bg-brand-surface w-full max-h-[80vh] rounded-t-lg" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-brand-border flex justify-between items-center">
          <h3 className="text-brand-text font-semibold flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Comments ({comments.length})
          </h3>
          <Button variant="ghost" onClick={onClose} size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-4 max-h-96 overflow-y-auto space-y-3">
          {loadingComments ? (
            <div className="text-center text-brand-muted py-8">
              <p>Loading comments...</p>
            </div>
          ) : commentTree.length === 0 ? (
            <div className="text-center text-brand-muted py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            commentTree.map((comment) => renderCommentTree(comment))
          )}
        </div>
        <div className="p-4 border-t border-brand-border">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mr-2 rounded"
            />
            <label htmlFor="anonymous" className="text-sm text-brand-muted">
              Post anonymously 👻
            </label>
          </div>
          <div className="flex space-x-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a thoughtful comment..."
              className="resize-none"
              rows={2}
              maxLength={500}
            />
            <Button
              onClick={() => handleReply(null, newComment, isAnonymous)}
              disabled={loading || !newComment.trim()}
              className="btn-primary"
            >
              {loading ? '...' : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-brand-muted mt-1">
            {newComment.length}/500 characters
          </p>
        </div>
      </div>
    </div>
  );
};