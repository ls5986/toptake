import React, { useState, useEffect, useRef } from 'react';
import { AppBlocker } from './AppBlocker';
import { TodaysPrompt } from './TodaysPrompt';
import { Take } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTodayPrompt } from '@/lib/supabase';
import { TakeCard } from './TakeCard';

interface TopTakesScreenProps {
  focusedTakeId?: string | null;
}

const TopTakesScreen: React.FC<TopTakesScreenProps> = ({ focusedTakeId }) => {
  const { user, isAppBlocked, setIsAppBlocked, checkDailyPost } = useAppContext();
  const [topTakes, setTopTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [promptText, setPromptText] = useState('');
  const fetchInProgress = useRef(false);
  const takeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightedTakeId, setHighlightedTakeId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !isAppBlocked && !fetchInProgress.current) {
      fetchInProgress.current = true;
      console.log('TopTakesScreen: fetching prompt and top takes');
      loadPromptAndTopTakes().finally(() => {
        fetchInProgress.current = false;
      });
    }
  }, [user, isAppBlocked]);

  useEffect(() => {
    if (focusedTakeId && takeRefs.current[focusedTakeId]) {
      takeRefs.current[focusedTakeId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedTakeId(focusedTakeId);
      setTimeout(() => setHighlightedTakeId(null), 2000);
    }
  }, [focusedTakeId]);

  const fetchPromptForDate = async () => {
    const { data, error } = await getTodayPrompt();
    if (error || !data || !data.prompt_text) return '';
    return data.prompt_text;
  };

  const loadPromptAndTopTakes = async () => {
    setLoading(true);
    try {
      const promptText = await fetchPromptForDate();
      setPromptText(promptText);
      // Fetch all takes for today (using correct date)
      const { data, error } = await supabase
        .from('takes')
        .select('*')
        .eq('prompt_date', new Date().toISOString().split('T')[0]);
      // Fetch profiles for user_ids
      const userIds = [...new Set((data || []).map(t => t.user_id).filter(Boolean))];
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        profileMap = (profiles || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, any>);
      }
      if (error) {
        setTopTakes([]);
        setLoading(false);
        return;
      }
      // Fetch all comments for today's takes and count per take
      const takeIds = (data || []).map(take => take.id);
      let commentCountMap: Record<string, number> = {};
      if (takeIds.length > 0) {
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('id, take_id')
          .in('take_id', takeIds);
        if (!commentsError && commentsData) {
          commentCountMap = commentsData.reduce((acc, row) => {
            acc[row.take_id] = (acc[row.take_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
      }
      // Format and sort by engagement
      const formattedTakes = (data || []).map(take => ({
        id: take.id,
        userId: take.user_id,
        content: take.content,
        username: take.is_anonymous ? 'Anonymous' : profileMap[take.user_id]?.username || 'Unknown',
        isAnonymous: take.is_anonymous,
        timestamp: take.created_at,
        reactions: take.reactions || { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 },
        commentCount: commentCountMap[take.id] || 0
      }));
      const sortedTakes = formattedTakes.sort((a, b) => {
        const aTotal = Object.values(a.reactions).reduce((sum, val) => sum + val, 0);
        const bTotal = Object.values(b.reactions).reduce((sum, val) => sum + val, 0);
        return bTotal - aTotal;
      });
      setTopTakes(sortedTakes);
    } catch (error) {
      setTopTakes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReaction = async (takeId: string, reaction: keyof Take['reactions']) => {
    try {
      if (!user?.hasPostedToday) {
        return;
      }
      setTopTakes(prev => prev.map(t => 
        t.id === takeId ? { 
          ...t, 
          reactions: {
            ...t.reactions,
            [reaction]: t.reactions[reaction] + 1
          }
        } : t
      ));
      const take = topTakes.find(t => t.id === takeId);
      if (!take) return;
      const updatedReactions = {
        ...take.reactions,
        [reaction]: take.reactions[reaction] + 1
      };
      await supabase
        .from('takes')
        .update({ reactions: updatedReactions })
        .eq('id', takeId);
      // Add notification for reaction
      if (take && user && take.userId !== user.id) {
        await supabase.from('notifications').insert([{
          user_id: take.userId,
          type: 'reaction',
          actor_id: user.id,
          takeid: take.id,
          created_at: new Date().toISOString(),
          read: false,
          extra: { reaction }
        }]);
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPromptAndTopTakes();
    setTimeout(() => setRefreshing(false), 400);
  };

  const handleUnlock = async () => {
    try {
      setIsAppBlocked(false);
      await checkDailyPost();
      await loadPromptAndTopTakes();
    } catch (error) {
      console.error('Error unlocking:', error);
    }
  };

  if (isAppBlocked) {
    return <AppBlocker isBlocked={isAppBlocked} onSubmit={handleUnlock} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-shrink-0">
        <TodaysPrompt prompt={promptText} takeCount={topTakes.length} loading={loading} />
      </div>
      
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
              <p>Loading top takes...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between sticky top-0 bg-brand-surface py-2 z-10">
                <h2 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Today's Top Takes ({topTakes.length})
                </h2>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 text-brand-accent ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {topTakes
                .slice()
                .sort((a, b) => {
                  const engagementA = Object.values(a.reactions || {}).reduce((sum, c) => sum + (typeof c === 'number' ? c : 0), 0) + (a.commentCount || 0);
                  const engagementB = Object.values(b.reactions || {}).reduce((sum, c) => sum + (typeof c === 'number' ? c : 0), 0) + (b.commentCount || 0);
                  return engagementB - engagementA;
                })
                .map((take, index) => (
                  <div
                    key={take.id}
                    ref={el => (takeRefs.current[take.id] = el)}
                    className={highlightedTakeId === take.id ? 'ring-2 ring-brand-accent rounded-lg transition-all duration-300' : ''}
                  >
                    <TakeCard 
                      take={take} 
                      onReact={handleReaction}
                    />
                  </div>
                ))}
              
              {topTakes.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <p>No top takes yet today!</p>
                  <p className="text-sm mt-2">Be the first to share your take</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default TopTakesScreen;