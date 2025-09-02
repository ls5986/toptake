import React, { useState, useEffect, useRef } from 'react';
import { AppBlocker } from './AppBlocker';
import { TodaysPrompt } from './TodaysPrompt';
import { Take } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Trophy, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTodayPrompt } from '@/lib/supabase';
import { TakeCard } from './TakeCard';
import BillingModal from './BillingModal';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePromptForDate } from '@/hooks/usePromptForDate';
import { spendCredits } from '@/lib/credits';
import { getReactionCounts, addReaction, ReactionType } from '@/lib/reactions';

interface TopTakesScreenProps {
  focusedTakeId?: string | null;
}

const TopTakesScreen: React.FC<TopTakesScreenProps> = ({ focusedTakeId }) => {
  const { user, isAppBlocked, setIsAppBlocked, checkDailyPost, userCredits, setUserCredits } = useAppContext();
  const [topTakes, setTopTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetchInProgress = useRef(false);
  const takeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightedTakeId, setHighlightedTakeId] = useState<string | null>(null);
  const [showSneakPeekModal, setShowSneakPeekModal] = useState(false);
  const [unlockingTakeId, setUnlockingTakeId] = useState<string | null>(null);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { promptText, loading: promptLoading } = usePromptForDate(selectedDate);
  const [reactionCounts, setReactionCounts] = useState<Record<string, Record<ReactionType, number>>>({});

  const canSneakPeek = user && userCredits.sneak_peek > 0;

  useEffect(() => {
    if (user && !isAppBlocked && !fetchInProgress.current) {
      fetchInProgress.current = true;
      console.log('TopTakesScreen: fetching prompt and top takes');
      loadPromptAndTopTakes().finally(() => {
        fetchInProgress.current = false;
      });
    }
  }, [user, isAppBlocked, selectedDate]);

  useEffect(() => {
    if (focusedTakeId && takeRefs.current[focusedTakeId]) {
      takeRefs.current[focusedTakeId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedTakeId(focusedTakeId);
      setTimeout(() => setHighlightedTakeId(null), 2000);
    }
  }, [focusedTakeId]);

  useEffect(() => {
    async function fetchAllReactions() {
      const counts: Record<string, Record<ReactionType, number>> = {};
      for (const take of topTakes) {
        counts[take.id] = await getReactionCounts(take.id);
      }
      setReactionCounts(counts);
    }
    if (topTakes.length > 0) fetchAllReactions();
  }, [topTakes]);

  const loadPromptAndTopTakes = async () => {
    setLoading(true);
    try {
      // Fetch all takes for selected date
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('takes')
        .select('*')
        .eq('prompt_date', dateStr);
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
        prompt_id: take.prompt_id,
        reactionsCount: 0, // Placeholder, can be updated if needed
        commentCount: commentCountMap[take.id] || 0,
        isBoosted: take.is_boosted || false,
      }));
      const sortedTakes = formattedTakes.sort((a, b) => {
        const aTotal = Object.values(reactionCounts[a.id] || {}).reduce((sum, val) => sum + val, 0) + (typeof a.commentCount === 'number' ? a.commentCount : 0);
        const bTotal = Object.values(reactionCounts[b.id] || {}).reduce((sum, val) => sum + val, 0) + (typeof b.commentCount === 'number' ? b.commentCount : 0);
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

  const handleReaction = async (takeId: string, reaction: ReactionType) => {
    if (!user) return;
    await addReaction(takeId, user.id, reaction);
    // Refetch reaction counts for this take
    const counts = await getReactionCounts(takeId);
    setReactionCounts(prev => ({
      ...prev,
      [takeId]: counts
    }));
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

  const isFutureTake = (take) => {
    const today = new Date();
    const takeDate = new Date(take.timestamp);
    return takeDate > today;
  };

  const handleSneakPeekUnlock = async (take) => {
    if (!canSneakPeek) {
      setShowSneakPeekModal(true);
      return;
    }
    setUnlockingTakeId(take.id);
    const spent = await spendCredits(user.id, 'sneak_peek', 1);
    if (!spent) {
      toast({ 
        title: 'Insufficient Credits', 
        description: 'You need sneak peek credits to unlock this take. Purchase some credits to continue.', 
        variant: 'destructive' 
      });
      setUnlockingTakeId(null);
      return;
    }
    setUserCredits({ ...userCredits, sneak_peek: userCredits.sneak_peek - 1 });
    // Insert into sneak_peeks and decrement credit
    await supabase.from('sneak_peeks').insert({ user_id: user.id, take_id: take.id, created_at: new Date().toISOString() });
    toast({ title: 'Sneak Peek Unlocked', description: 'You have unlocked a future take!' });
    setUnlockingTakeId(null);
    // Optionally, refetch or optimistically update UI to reveal take
  };

  if (isAppBlocked) {
    return <AppBlocker isBlocked={isAppBlocked} onSubmit={handleUnlock} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-shrink-0">
        <TodaysPrompt 
          prompt={promptText} 
          takeCount={topTakes.length} 
          loading={promptLoading}
          selectedDate={selectedDate}
        />
      </div>
      
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
              <p>Loading top takes...</p>
            </div>
          </div>
        ) : !promptText ? (
          <div className="text-center text-brand-danger py-8">
            <p>No prompt found for today's topic!</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between sticky top-0 bg-brand-surface py-2 z-10">
                <h2 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  {format(selectedDate, 'MMM dd, yyyy')} Top Takes ({topTakes.length})
                </h2>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        {format(selectedDate, 'MMM dd, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className={`w-4 h-4 text-brand-accent ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              
              {topTakes
                .slice()
                .sort((a, b) => {
                  const engagementA = Object.values(reactionCounts[a.id] || {}).reduce((sum, val) => sum + val, 0) + (typeof a.commentCount === 'number' ? a.commentCount : 0);
                  const engagementB = Object.values(reactionCounts[b.id] || {}).reduce((sum, val) => sum + val, 0) + (typeof b.commentCount === 'number' ? b.commentCount : 0);
                  return engagementB - engagementA;
                })
                .map((take, index) => {
                  const futureTake = isFutureTake(take);
                  const canView = !futureTake || canSneakPeek;
                  return (
                    <div
                      key={take.id}
                      ref={el => (takeRefs.current[take.id] = el)}
                      className={highlightedTakeId === take.id ? 'ring-2 ring-brand-accent rounded-lg transition-all duration-300' : ''}
                    >
                      {!canView ? (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10 rounded-lg">
                          <div className="text-white text-lg mb-2">🔒 Sneak Peek Locked</div>
                          <Button
                            onClick={() => handleSneakPeekUnlock(take)}
                            className="bg-blue-500 text-white hover:bg-blue-600"
                          >
                            {canSneakPeek ? 'Unlock Sneak Peek' : 'Buy Sneak Peek Credit'}
                          </Button>
                        </div>
                      ) : null}
                      <div className={canView ? '' : 'blur-sm pointer-events-none select-none'}>
                        <TakeCard 
                          take={take} 
                          onReact={handleReaction}
                          reactionCounts={reactionCounts[take.id] || { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 }}
                        />
                      </div>
                    </div>
                  );
                })}
              
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
      <BillingModal isOpen={showSneakPeekModal} onClose={() => setShowSneakPeekModal(false)} />
    </div>
  );
};

export default TopTakesScreen;