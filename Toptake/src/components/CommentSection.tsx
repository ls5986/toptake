import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

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
  const [comments, setComments] = useState<Comment[]>([]);
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

  const loadComments = async () => {
    try {
      setLoadingComments(true);
      console.log('Loading comments for takeId:', takeId);
      
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('take_id', takeId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading comments:', error);
        throw error;
      }

      console.log('Loaded comments:', data);
      setComments(data || []);
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

  const submitComment = async () => {
    if (!newComment.trim()) return;
    
    setLoading(true);
    
    try {
      console.log('Submitting comment for takeId:', takeId);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({ 
          title: 'Please log in to comment', 
          variant: 'destructive' 
        });
        return;
      }

      // Get user profile for username
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

      const username = isAnonymous ? 'Anonymous' : (profile?.username || 'User');
      
      const commentData = {
        content: newComment.trim(),
        take_id: takeId,
        user_id: user.id,
        is_anonymous: isAnonymous,
        username: username
      };

      console.log('Inserting comment:', commentData);

      const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single();

      if (error) {
        console.error('Error inserting comment:', error);
        throw error;
      }

      console.log('Comment inserted successfully:', data);
      
      // Add the new comment to the local state
      setComments(prev => [...prev, data]);
      setNewComment('');
      
      toast({ 
        title: 'Comment posted successfully!', 
        duration: 2000 
      });
      
    } catch (error: any) {
      console.error('Failed to post comment:', error);
      toast({ 
        title: 'Failed to post comment', 
        description: error.message || 'Please try again',
        variant: 'destructive'
      });
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={onClose}>
      <div className="bg-gray-900 w-full max-h-[80vh] rounded-t-lg" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-white font-semibold flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            Comments ({comments.length})
          </h3>
          <Button variant="ghost" onClick={onClose} size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="p-4 max-h-96 overflow-y-auto space-y-3">
          {loadingComments ? (
            <div className="text-center text-gray-400 py-8">
              <p>Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <Card key={comment.id} className="bg-gray-800 border-gray-700">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-white">
                        {comment.username}
                      </span>
                      {comment.is_anonymous && (
                        <Badge variant="secondary" className="bg-purple-600 text-xs">👻</Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm">{comment.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mr-2 rounded"
            />
            <label htmlFor="anonymous" className="text-sm text-gray-300">
              Post anonymously 👻
            </label>
          </div>
          <div className="flex space-x-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a thoughtful comment..."
              className="bg-gray-800 border-gray-600 text-white resize-none"
              rows={2}
              maxLength={500}
            />
            <Button 
              onClick={submitComment} 
              disabled={loading || !newComment.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? '...' : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {newComment.length}/500 characters
          </p>
        </div>
      </div>
    </div>
  );
};