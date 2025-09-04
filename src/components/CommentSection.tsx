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
      console.log('[comments] load →', { takeId })
      // 1) Fetch comments strictly for this take
      const { data: rows, error } = await supabase
        .from('comments')
        .select('id, content, is_anonymous, created_at, user_id, parent_comment_id, profiles(username)')
        .eq('take_id', takeId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const formatted: CommentType[] = (rows || []).map((c: any) => ({
        id: c.id,
        content: c.content,
        is_anonymous: c.is_anonymous,
        created_at: c.created_at,
        user_id: c.user_id,
        parent_comment_id: c.parent_comment_id,
        username: c.is_anonymous ? 'Anonymous' : (c.profiles?.username || 'User'),
      }));
      setComments(formatted);

      // 2) Fetch votes for these comments and aggregate counts
      const ids = formatted.map(c => c.id);
      const voteMap: Record<string, { like: number; dislike: number; userVote?: 'like' | 'dislike' }> = {};
      if (ids.length > 0) {
        const { data: votesRows } = await supabase
          .from('comment_votes')
          .select('comment_id, vote_type, user_id')
          .in('comment_id', ids);
        (votesRows || []).forEach((v: any) => {
          const entry = voteMap[v.comment_id] || { like: 0, dislike: 0 };
          if (v.vote_type === 'like') entry.like += 1; else if (v.vote_type === 'dislike') entry.dislike += 1;
          voteMap[v.comment_id] = entry;
        });
      }
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
      const displayComment: CommentType = { 
        id: inserted.id,
        content: inserted.content,
        is_anonymous: inserted.is_anonymous,
        created_at: inserted.created_at,
        user_id: inserted.user_id,
        parent_comment_id: inserted.parent_comment_id,
        username: displayUsername
      };
      // If it's a reply, place it under its parent in the current tree; otherwise append as root
      setComments((prev) => {
        if (!parentId) return [...prev, displayComment];
        const next = [...prev];
        const idx = next.findIndex(c => c.id === parentId);
        if (idx !== -1) {
          // Append after parent so rebuild will nest properly on next refresh
          next.splice(idx + 1, 0, displayComment);
          return next;
        }
        return [...prev, displayComment];
      });
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
    console.log('[comments] vote toggle →', { commentId, voteType, userId })
    await supabase.rpc('comment_vote_toggle', {
      p_comment_id: commentId,
      p_user_id: userId,
      p_vote_type: voteType,
    });
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