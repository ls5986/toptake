import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import clsx from 'clsx';

interface TakePageProps {
  takeId: string | null;
  commentId?: string | null;
}

interface Take {
  id: string;
  user_id: string;
  username: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  prompt_date?: string;
  reactions: Record<string, number>;
}

interface Comment {
  id: string;
  user_id: string;
  username: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  parent_comment_id?: string | null;
  like_count: number;
  dislike_count: number;
  replies?: Comment[];
}

// Add this type for raw comment from Supabase
interface RawComment {
  id: string;
  user_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  parent_comment_id?: string | null;
  profiles?: { username?: string };
}

const TakePage: React.FC<TakePageProps> = ({ takeId, commentId }) => {
  const { setCurrentScreen } = useAppContext();
  const [take, setTake] = useState<Take | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [highlightedComment, setHighlightedComment] = useState<string | null>(null);
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!takeId) return;
    setLoading(true);
    const fetchTakeAndComments = async () => {
      // Fetch take
      const { data: takeData } = await supabase
        .from('takes')
        .select('*, profiles(username)')
        .eq('id', takeId)
        .single();
      if (takeData) {
        setTake({
          id: takeData.id,
          user_id: takeData.user_id,
          username: takeData.is_anonymous ? 'Anonymous' : (takeData.profiles?.username || 'User'),
          content: takeData.content,
          is_anonymous: takeData.is_anonymous,
          created_at: takeData.created_at,
          prompt_date: takeData.prompt_date,
          reactions: takeData.reactions || {},
        });
        // Fetch prompt
        if (takeData.prompt_id) {
          const { data: promptData } = await supabase
            .from('daily_prompts')
            .select('prompt_text')
            .eq('id', takeData.prompt_id)
            .single();
          setPrompt(promptData?.prompt_text || '');
        } else if (takeData.prompt_date) {
          const { data: promptData } = await supabase
            .from('daily_prompts')
            .select('prompt_text')
            .eq('prompt_date', takeData.prompt_date)
            .single();
          setPrompt(promptData?.prompt_text || '');
        }
      }
      // Fetch comments via RPC with aggregated votes and usernames
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_comments_with_votes', { take_id: takeId });
      if (rpcError) {
        console.error('Error loading comments via RPC:', rpcError);
        setComments([]);
      } else {
        const commentsWithVotes: Comment[] = (rpcData || []).map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          username: c.is_anonymous ? 'Anonymous' : (c.username || 'User'),
          content: c.content,
          is_anonymous: c.is_anonymous,
          created_at: c.created_at,
          parent_comment_id: c.parent_comment_id,
          like_count: c.like_count || 0,
          dislike_count: c.dislike_count || 0,
        }));
        setComments(buildCommentTree(commentsWithVotes));
      }
      setLoading(false);
    };
    fetchTakeAndComments();
  }, [takeId, refresh]);

  useEffect(() => {
    if (commentId) {
      setHighlightedComment(commentId);
      setTimeout(() => setHighlightedComment(null), 2000);
      // Scroll to comment
      setTimeout(() => {
        commentRefs.current[commentId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [commentId, comments]);

  // Build threaded comment tree
  const buildCommentTree = (flatComments: Comment[]): Comment[] => {
    const map: Record<string, Comment & { replies: Comment[] }> = {};
    const roots: (Comment & { replies: Comment[] })[] = [];
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

  // Handle reply submit
  const handleReply = async (parentId: string | null) => {
    if (!replyText.trim() || !takeId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('comments').insert({
      content: replyText,
      take_id: takeId,
      user_id: user.id,
      is_anonymous: false,
      parent_comment_id: parentId,
    });
    setReplyText('');
    setReplyingTo(null);
    setRefresh(r => r + 1);
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

  // Add like/dislike logic
  const handleVote = async (commentId: string, voteType: 'like' | 'dislike') => {
    // Optimistic UI: update counts locally
    setComments(prev => prev.map(c =>
      c.id === commentId
        ? { ...c, like_count: voteType === 'like' ? c.like_count + 1 : c.like_count, dislike_count: voteType === 'dislike' ? c.dislike_count + 1 : c.dislike_count }
        : c
    ));
    // Upsert vote
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('comment_votes').upsert({
      comment_id: commentId,
      user_id: user.id,
      vote_type: voteType,
      created_at: new Date().toISOString(),
    });
    setRefresh(r => r + 1);
  };

  const renderComments = (comments: Comment[], depth = 0) => (
    <div>
      {comments.map(comment => (
        <div
          key={comment.id}
          ref={el => (commentRefs.current[comment.id] = el)}
          className={clsx('mb-3', depth > 0 && `ml-[${depth*24}px]`, highlightedComment === comment.id && 'ring-2 ring-brand-accent rounded')}
        >
          <Card className="bg-brand-surface border-brand-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-brand-text">{comment.username}</span>
                <span className="text-xs text-brand-muted">{formatTime(comment.created_at)}</span>
              </div>
              <div className="text-brand-text/90 text-sm mb-2">{comment.content}</div>
              <div className="flex items-center gap-3 mb-1">
                <Button variant="ghost" size="sm" className="text-xs text-brand-accent hover:text-brand-primary" onClick={() => {
                  setReplyingTo(comment.id);
                  setReplyText(`@${comment.username} `);
                }}>
                  Reply
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs" onClick={() => handleVote(comment.id, 'like')}>
                  <ThumbsUp className="w-4 h-4" /> {comment.like_count}
                </Button>
                <Button variant="ghost" size="sm" className="flex items-center gap-1 text-xs" onClick={() => handleVote(comment.id, 'dislike')}>
                  <ThumbsDown className="w-4 h-4" /> {comment.dislike_count}
                </Button>
              </div>
              {replyingTo === comment.id && (
                <div className="mt-2">
                  <Textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="resize-none"
                    rows={2}
                    maxLength={500}
                  />
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" onClick={() => handleReply(comment.id)} disabled={!replyText.trim()}>
                      Post
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setReplyingTo(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          {comment.replies && comment.replies.length > 0 && renderComments(comment.replies, depth + 1)}
        </div>
      ))}
    </div>
  );

  if (loading) {
    return <div className="flex items-center justify-center h-full text-brand-muted">Loading...</div>;
  }

  // Engagement score: sum of all reactions + comment count
  const engagement = take ? Object.values(take.reactions).reduce((a, b) => a + b, 0) + comments.length : 0;

  return (
    <div className="w-full mx-auto py-6 px-4 sm:px-6 md:max-w-2xl lg:max-w-3xl xl:max-w-4xl">
      <Button variant="ghost" size="sm" className="mb-4 flex items-center gap-2" onClick={() => setCurrentScreen('main')}>
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      {prompt && (
        <Card className="mb-4 bg-brand-accent border-brand-border">
          <CardContent className="p-4">
            <div className="text-brand-text text-lg font-semibold">{prompt}</div>
          </CardContent>
        </Card>
      )}
      {take && (
        <Card className="mb-6 bg-brand-surface border-brand-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-brand-text">{take.username}</span>
              <span className="text-xs text-brand-muted">{formatTime(take.created_at)}</span>
            </div>
            <div className="text-brand-text text-lg mb-2">{take.content}</div>
            <div className="text-xs text-brand-accent font-semibold">Engagement: {engagement}</div>
          </CardContent>
        </Card>
      )}
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-brand-accent" />
        <span className="text-brand-text font-semibold">Comments</span>
      </div>
      {/* Top-level reply */}
      {replyingTo === null && (
        <div className="mb-6">
          <Textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Add a thoughtful comment..."
            className="resize-none"
            rows={2}
            maxLength={500}
          />
          <div className="flex gap-2 mt-1">
            <Button size="sm" onClick={() => handleReply(null)} disabled={!replyText.trim()}>
              Post
            </Button>
          </div>
        </div>
      )}
      {comments.length === 0 ? (
        <div className="text-brand-muted text-center py-8">No comments yet. Be the first to comment!</div>
      ) : (
        renderComments(comments)
      )}
    </div>
  );
};

export default TakePage; 