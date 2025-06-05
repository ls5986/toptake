import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

export interface Comment {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  username: string;
  take_id: string;
  parent_comment_id?: string | null;
  replies?: Comment[];
}

interface CommentThreadProps {
  comment: Comment;
  onReply: (parentId: string, content: string, isAnonymous: boolean) => Promise<void>;
  depth?: number;
}

export const CommentThread: React.FC<CommentThreadProps> = ({ comment, onReply, depth = 0 }) => {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    await onReply(comment.id, replyText, isAnonymous);
    setReplyText('');
    setShowReply(false);
    setLoading(false);
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

  return (
    <div style={{ marginLeft: depth * 20, marginTop: 8 }}>
      <Card className="bg-brand-surface border-border">
        <CardContent className="p-3">
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-brand-text">
                {comment.username}
              </span>
              {comment.is_anonymous && (
                <Badge variant="secondary" className="bg-brand-accent text-xs">👻</Badge>
              )}
            </div>
            <span className="text-xs text-brand-muted">
              {formatTime(comment.created_at)}
            </span>
          </div>
          <p className="text-brand-text/90 text-sm mb-2">{comment.content}</p>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-brand-accent hover:text-brand-primary"
              onClick={() => setShowReply((v) => !v)}
            >
              Reply
            </Button>
          </div>
          {showReply && (
            <div className="mt-2">
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id={`anonymous-reply-${comment.id}`}
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="mr-2 rounded"
                />
                <label htmlFor={`anonymous-reply-${comment.id}`} className="text-xs text-brand-muted">
                  Reply anonymously 👻
                </label>
              </div>
              <div className="flex space-x-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  className="resize-none"
                  rows={2}
                  maxLength={500}
                />
                <Button
                  onClick={handleReply}
                  disabled={loading || !replyText.trim()}
                  className="btn-primary"
                >
                  {loading ? '...' : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Render replies recursively */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentThread key={reply.id} comment={reply} onReply={onReply} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentThread; 