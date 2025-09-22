import React, { useState, useEffect, useRef } from 'react';
import { AppBlocker } from './AppBlocker';
import { TodaysPrompt } from './TodaysPrompt';
import { Take } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
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
import { useTakesForDate } from '@/hooks/useTakesForDate';
import { spendCredits } from '@/lib/credits';
import { getReactionCounts, addReaction, ReactionType } from '@/lib/reactions';
import LeaderboardScreen from './LeaderboardScreen';

interface TopTakesScreenProps {
  focusedTakeId?: string | null;
  selectedDate: Date;
  onDateChange: (d: Date) => void;
}

const TopTakesScreen: React.FC<TopTakesScreenProps> = ({ focusedTakeId, selectedDate, onDateChange }) => {
  const { user, isAppBlocked, setIsAppBlocked, checkDailyPost, userCredits, setUserCredits } = useAppContext();
  const [topTakes, setTopTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subTab, setSubTab] = useState<'top' | 'streaks'>('top');
  const fetchInProgress = useRef(false);
  const takeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [highlightedTakeId, setHighlightedTakeId] = useState<string | null>(null);
  const [showSneakPeekModal, setShowSneakPeekModal] = useState(false);
  const [unlockingTakeId, setUnlockingTakeId] = useState<string | null>(null);
  const { toast } = useToast();
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

  const { takes: dateTakes, loading: takesLoading, setBefore } = useTakesForDate(selectedDate);
  useEffect(() => {
    console.log('[TopTakes] page data', {
      count: dateTakes?.length,
      first: dateTakes?.[0]?.id,
      last: dateTakes?.[dateTakes.length - 1]?.id
    });
  }, [dateTakes]);
  // Keep local list/loading in sync with hook output (mirrors FeedScreen)
  useEffect(() => {
    setTopTakes(dateTakes as any);
    setLoading(takesLoading);
  }, [dateTakes, takesLoading]);
  const loadPromptAndTopTakes = async () => {
    setLoading(true);
    try {
      setTopTakes(dateTakes as any);
    } finally {
      setLoading(takesLoading);
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (loading || refreshing) return;
    if (!topTakes || topTakes.length === 0) return;
    const last = topTakes[topTakes.length - 1];
    if (last?.timestamp) {
      setRefreshing(true);
      setBefore(last.timestamp);
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  // Infinite scroll using ScrollArea viewport as root
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    // Find the nearest Radix ScrollArea viewport
    const rootEl = containerRef.current?.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting) {
        handleLoadMore();
      }
    }, { root: rootEl || undefined, threshold: 0.1 });

    observer.observe(sentinel);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topTakes, loading, refreshing]);

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
    toast({ title: 'Sneak Peek credit used', description: '-1 Sneak Peek credit' });
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
    <div className="w-full" ref={containerRef}>
      <TodaysPrompt 
        prompt={promptText} 
        takeCount={topTakes.length} 
        loading={promptLoading}
        selectedDate={selectedDate}
      />

      {/* Sub-tabs (non-sticky; parent provides scrolling) */}
      <div className="border-b border-brand-border px-2 py-2 bg-brand-surface">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md overflow-hidden border border-brand-border">
            <button
              className={`px-3 py-1.5 text-sm ${subTab==='top' ? 'bg-brand-accent/20 text-brand-text' : 'text-brand-muted'}`}
              onClick={()=> setSubTab('top')}
            >
              Top
            </button>
            <button
              className={`px-3 py-1.5 text-sm ${subTab==='streaks' ? 'bg-brand-accent/20 text-brand-text' : 'text-brand-muted'}`}
              onClick={()=> setSubTab('streaks')}
            >
              Streaks
            </button>
          </div>
        </div>
      </div>

      {subTab === 'streaks' ? (
        <div className="p-3">
          <LeaderboardScreen />
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16">
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
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between bg-brand-surface py-2 border-b border-brand-border px-1">
            <div className="text-[11px] uppercase tracking-wide text-brand-muted flex items-center gap-1">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>Top takes</span>
              <span className="text-brand-text/80 ml-1">{topTakes.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="px-3 py-1.5 h-8 gap-1.5">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="text-xs">{format(selectedDate, 'MMM dd')}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2 bg-brand-surface border-brand-border" align="end">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && onDateChange(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`w-4 h-4 text-brand-accent ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {topTakes.map((take) => {
            // Standardize UX: always render takes as interactive content here
            // (Sneak peek lock temporarily disabled to avoid overlay issues)
            const futureTake = false;
            const canView = true;
            return (
              <div
                key={take.id}
                ref={el => (takeRefs.current[take.id] = el)}
                className={`relative ${highlightedTakeId === take.id ? 'ring-2 ring-brand-accent rounded-lg transition-all duration-300' : ''}`}
              >
                <TakeCard 
                  take={take} 
                  onReact={handleReaction}
                  reactionCounts={reactionCounts[take.id] || { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 }}
                />
              </div>
            );
          })}

          {topTakes.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              <p>No top takes yet today!</p>
              <p className="text-sm mt-2">Be the first to share your take</p>
            </div>
          )}
          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-6" />
        </div>
      )}

      <BillingModal isOpen={showSneakPeekModal} onClose={() => setShowSneakPeekModal(false)} />
    </div>
  );
};

export default TopTakesScreen;