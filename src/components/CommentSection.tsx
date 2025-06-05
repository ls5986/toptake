import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import CommentThread, { Comment as CommentType } from './CommentThread';

interface Comment {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  username: string;
  take_id: string;
}

interface CommentSectionProps {
  takeId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentSection = ({ takeId, isOpen, onClose }: CommentSectionProps) => {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && takeId) {
      loadComments();
    }
  }, [isOpen, takeId]);

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
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username)')
        .eq('take_id', takeId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const formatted = (data || []).map((c: any) => ({
        ...c,
        username: c.is_anonymous ? 'Anonymous' : (c.profiles?.username || 'User'),
      }));
      setComments(formatted);
    } catch (error) {
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
      const commentData: any = {
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
      const displayComment = { ...inserted, username: displayUsername };
      setComments((prev) => [...prev, displayComment]);
      setNewComment('');
      toast({ title: 'Comment posted successfully!', duration: 2000 });
    } catch (error: any) {
      toast({ title: 'Failed to post comment', description: error.message || 'Please try again', variant: 'destructive' });
    } finally {
      setLoading(false);
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
            commentTree.map((comment) => (
              <CommentThread key={comment.id} comment={comment} onReply={handleReply} />
            ))
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