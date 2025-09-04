import React, { useState, useEffect, useRef } from 'react';
import { TakeCard } from './TakeCard';
import { AppBlocker } from './AppBlocker';
import { TodaysPrompt } from './TodaysPrompt';
import { Take, User } from '@/types';
import { supabase } from '@/lib/supabase';
import { useTakesForDate } from '@/hooks/useTakesForDate';
import { useAppContext } from '@/contexts/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePromptForDate } from '@/hooks/usePromptForDate';
import { getReactionCounts, addReaction, ReactionType } from '@/lib/reactions';

const FeedScreen: React.FC = () => {
  const { user, isAppBlocked, setIsAppBlocked, checkDailyPost } = useAppContext();
  const [takes, setTakes] = useState<Take[]>([]);
  // List loading comes from sharedLoading below; avoid duplicate spinners
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const fetchInProgress = useRef(false);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Use selected date's prompt
  const { promptText, loading: promptLoading } = usePromptForDate(selectedDate);
  
  const { takes: sharedTakes, loading: sharedLoading, setBefore } = useTakesForDate(selectedDate);
  useEffect(() => {
    console.log('[Feed] page data', {
      count: sharedTakes?.length,
      first: sharedTakes?.[0]?.id,
      last: sharedTakes?.[sharedTakes.length - 1]?.id
    });
  }, [sharedTakes]);

  useEffect(() => {
    if (!user || isAppBlocked) return;
    // Ensure the user's own take is pinned at the top if present
    let next = [...(sharedTakes as any)]
    if (user?.id) {
      const idx = next.findIndex(t => t.userId === user.id)
      if (idx > 0) {
        const [mine] = next.splice(idx, 1)
        next.unshift(mine)
      }
    }
    setTakes(next);
  }, [user, isAppBlocked, sharedTakes, sharedLoading]);

  const handleReaction = async (takeId: string, reaction: ReactionType) => {
    // Simplified: reactions handled inside TakeCard; keep signature for type safety
    console.log('Reaction:', reaction, 'on take:', takeId);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // no-op: hook auto refreshes on date change; force a light UI refresh
    setTakes(sharedTakes as any);
    setTimeout(() => setRefreshing(false), 400);
  };

  const handleLoadMore = () => {
    if (loadingMore || sharedLoading) return;
    if (!takes || takes.length === 0) return;
    setLoadingMore(true);
    const last = takes[takes.length - 1];
    if (last?.timestamp) {
      setBefore(last.timestamp);
      // give hook time to fetch; UI loading indicator handled by sharedLoading
      setTimeout(() => setLoadingMore(false), 400);
    } else {
      setLoadingMore(false);
    }
  };

  const handleUnlock = async () => {
    try {
      setIsAppBlocked(false);
      await checkDailyPost();
      // Light refresh: re-sync local list from sharedTakes
      setTakes(sharedTakes as any);
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
        <TodaysPrompt 
          prompt={promptText} 
          takeCount={takes.length} 
          loading={promptLoading}
          selectedDate={selectedDate}
        />
      </div>
      <div className="flex-1 min-h-0">
        {sharedLoading && !promptText ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-brand-text">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto mb-4"></div>
              <p>Loading takes...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between sticky top-0 bg-brand-surface py-2 z-10">
                <h2 className="text-xl font-semibold text-brand-text flex items-center gap-2">
                  💬 {format(selectedDate, 'MMM dd, yyyy')} Takes ({takes.length})
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
                    size="sm"
                    className="btn-secondary"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              {takes.map((take) => (
                <TakeCard 
                  key={take.id}
                  take={take} 
                  onReact={handleReaction}
                />
              ))}
              <div className="flex justify-center py-4">
                <Button onClick={handleLoadMore} size="sm" variant="outline" disabled={loadingMore || sharedLoading}>
                  {loadingMore || sharedLoading ? 'Loading…' : 'Load more'}
                </Button>
              </div>
              {takes.length === 0 && (
                <div className="text-center text-brand-muted py-8">
                  <p>No takes yet today!</p>
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

export default FeedScreen;