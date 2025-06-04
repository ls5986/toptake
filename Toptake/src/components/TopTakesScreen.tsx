import React, { useState, useEffect } from 'react';
import { TopTakeCard } from './TopTakeCard';
import { AppBlocker } from './AppBlocker';
import { TodaysPrompt } from './TodaysPrompt';
import { Take } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { useDailyPrompt } from '@/hooks/useDailyPrompt';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TopTakesScreen: React.FC = () => {
  const { user, isAppBlocked, setIsAppBlocked, checkDailyPost } = useAppContext();
  const { todaysPrompt, currentPrompt, loading: promptLoading } = useDailyPrompt();
  const [topTakes, setTopTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user && !isAppBlocked && todaysPrompt) {
      loadTopTakes();
    }
  }, [user, isAppBlocked, todaysPrompt]);

  const loadTopTakes = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('takes')
        .select(`
          *,
          profiles!inner(username)
        `)
        .eq('prompt_date', today)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading top takes:', error);
        loadFakeTopTakes();
        return;
      }

      const formattedTakes = data.map(take => ({
        id: take.id,
        content: take.content,
        username: take.is_anonymous ? 'Anonymous' : take.profiles?.username || 'Unknown',
        isAnonymous: take.is_anonymous,
        reactions: take.reactions || { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 },
        commentCount: 0,
        timestamp: take.created_at
      }));

      // Sort by total reactions to get "top" takes
      const sortedTakes = formattedTakes.sort((a, b) => {
        const aTotal = Object.values(a.reactions).reduce((sum, val) => sum + val, 0);
        const bTotal = Object.values(b.reactions).reduce((sum, val) => sum + val, 0);
        return bTotal - aTotal;
      });

      setTopTakes(sortedTakes.slice(0, 10)); // Top 10 takes
    } catch (error) {
      console.error('Error loading top takes:', error);
      loadFakeTopTakes();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFakeTopTakes = () => {
    try {
      const stored = localStorage.getItem('fakeTakes');
      if (stored) {
        const allTakes = JSON.parse(stored);
        const today = new Date().toDateString();
        const todaysTakes = allTakes.filter((take: any) => 
          new Date(take.timestamp).toDateString() === today
        );
        // Sort by reactions and take top 10
        const sorted = todaysTakes.sort((a: Take, b: Take) => {
          const aTotal = Object.values(a.reactions).reduce((sum, val) => sum + val, 0);
          const bTotal = Object.values(b.reactions).reduce((sum, val) => sum + val, 0);
          return bTotal - aTotal;
        });
        setTopTakes(sorted.slice(0, 10));
      }
    } catch (error) {
      console.error('Error loading fake top takes:', error);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const handleReaction = (takeId: string, reaction: keyof Take['reactions']) => {
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
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTopTakes();
  };

  const handleUnlock = async () => {
    try {
      setIsAppBlocked(false);
      await checkDailyPost();
      await loadTopTakes();
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
        <TodaysPrompt prompt={currentPrompt} takeCount={topTakes.length} />
      </div>
      
      <div className="flex-1 min-h-0">
        {loading || promptLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
              <p>Loading top takes...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between sticky top-0 bg-gray-900 py-2 z-10">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  Today's Top Takes ({topTakes.length})
                </h2>
                <Button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                  className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              
              {topTakes.map((take, index) => (
                <TopTakeCard 
                  key={take.id} 
                  take={take} 
                  rank={index + 1}
                  onReact={handleReaction} 
                />
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