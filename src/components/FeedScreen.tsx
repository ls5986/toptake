import React, { useState, useEffect, useRef } from 'react';
import { TakeCard } from './TakeCard';
import { AppBlocker } from './AppBlocker';
import { TodaysPrompt } from './TodaysPrompt';
import { Take, User } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getTodayPrompt } from '@/lib/supabase';
import { hasFeatureCredit } from '@/lib/featureCredits';
import BillingModal from './BillingModal';

const FeedScreen: React.FC = () => {
  const { user, isAppBlocked, setIsAppBlocked, checkDailyPost } = useAppContext();
  const [takes, setTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [promptText, setPromptText] = useState('');
  const fetchInProgress = useRef(false);
  const [showSneakPeekModal, setShowSneakPeekModal] = useState(false);
  const [unlockingTakeId, setUnlockingTakeId] = useState<string | null>(null);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (user && !isAppBlocked && !fetchInProgress.current) {
      fetchInProgress.current = true;
      loadPromptAndTakes().finally(() => {
        fetchInProgress.current = false;
      });
    }
  }, [user, isAppBlocked]);

  const fetchPromptForDate = async () => {
    const { data, error } = await getTodayPrompt();
    if (error || !data || !data.prompt_text) return '';
    return data.prompt_text;
  };

  const loadPromptAndTakes = async () => {
    setLoading(true);
    try {
      const promptText = await fetchPromptForDate();
      setPromptText(promptText);
      // Fetch all takes for today
      const utcDate = new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate()
      ));
      const dateStr = utcDate.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('takes')
        .select('*')
        .eq('prompt_date', dateStr)
        .order('created_at', { ascending: false });
      // Fetch profiles for user_ids
      const userIds = [...new Set((data || []).map(t => t.user_id).filter(Boolean))];
      let profileMap: Record<string, Pick<User, 'id' | 'username'>> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        profileMap = (profiles || []).reduce((acc: Record<string, Pick<User, 'id' | 'username'>>, profile: { id: string; username: string }) => {
          acc[profile.id] = profile;
          return acc;
        }, {});
      }
      if (error) {
        setTakes([]);
        setLoading(false);
        return;
      }
      // Fetch all comments for today's takes and count per take
      const takeIds = (data || []).map((take: { id: string }) => take.id);
      let commentCountMap: Record<string, number> = {};
      if (takeIds.length > 0) {
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('id, take_id')
          .in('take_id', takeIds);
        if (!commentsError && commentsData) {
          commentCountMap = commentsData.reduce((acc: Record<string, number>, row: { take_id: string }) => {
            acc[row.take_id] = (acc[row.take_id] || 0) + 1;
            return acc;
          }, {});
        }
      }
      // Format takes to match Take type
      const formattedTakes: Take[] = (data || []).map((take: any) => ({
        id: take.id,
        userId: take.user_id,
        content: take.content,
        username: take.is_anonymous ? 'Anonymous' : profileMap[take.user_id]?.username || 'Unknown',
        isAnonymous: take.is_anonymous,
        timestamp: take.created_at,
        reactions: take.reactions || { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 },
        commentCount: commentCountMap[take.id] || 0
      }));
      setTakes(formattedTakes);
    } catch (error) {
      setTakes([]);
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
      setTakes(prev => prev.map(t => 
        t.id === takeId ? { 
          ...t, 
          reactions: {
            ...t.reactions,
            [reaction]: t.reactions[reaction] + 1
          }
        } : t
      ));
      const take = takes.find(t => t.id === takeId);
      if (!take) return;
      const updatedReactions = {
        ...take.reactions,
        [reaction]: take.reactions[reaction] + 1
      };
      await supabase
        .from('takes')
        .update({ reactions: updatedReactions })
        .eq('id', takeId);
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPromptAndTakes();
    setTimeout(() => setRefreshing(false), 400);
  };

  const handleUnlock = async () => {
    try {
      setIsAppBlocked(false);
      await checkDailyPost();
      await loadPromptAndTakes();
    } catch (error) {
      console.error('Error unlocking:', error);
    }
  };

  // Helper: is take from future prompt?
  const isFutureTake = (take) => {
    const today = new Date();
    const takeDate = new Date(take.timestamp);
    return takeDate > today;
  };

  const canSneakPeek = user && hasFeatureCredit(user, 'sneak_peek');

  const handleSneakPeekUnlock = async (take) => {
    if (!canSneakPeek) {
      setShowSneakPeekModal(true);
      return;
    }
    setUnlockingTakeId(take.id);
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
        <TodaysPrompt prompt={promptText} takeCount={takes.length} loading={loading} />
      </div>
      <div className="flex-1 min-h-0">
        {loading ? (
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
                  💬 Today's Hot Takes ({takes.length})
                </h2>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  size="sm"
                  className="btn-secondary"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {takes.map((take, index) => {
                const futureTake = isFutureTake(take);
                const canView = !futureTake || canSneakPeek;
                return (
                  <div key={take.id} className="relative">
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
                      />
                    </div>
                  </div>
                );
              })}
              {takes.length === 0 && (
                <div className="text-center text-brand-muted py-8">
                  <p>No takes yet today!</p>
                  <p className="text-sm mt-2">Be the first to share your take</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
        <BillingModal isOpen={showSneakPeekModal} onClose={() => setShowSneakPeekModal(false)} />
      </div>
    </div>
  );
};

export default FeedScreen;