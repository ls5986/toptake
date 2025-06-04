import React, { useState, useEffect, useRef } from 'react';
import { TopTakeCard } from './TopTakeCard';
import { AppBlocker } from './AppBlocker';
import { TodaysPrompt } from './TodaysPrompt';
import { Take } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TopTakesScreen: React.FC = () => {
  const { user, isAppBlocked, setIsAppBlocked, checkDailyPost } = useAppContext();
  const [topTakes, setTopTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [promptText, setPromptText] = useState('');
  const fetchInProgress = useRef(false);

  useEffect(() => {
    if (user && !isAppBlocked && !fetchInProgress.current) {
      fetchInProgress.current = true;
      console.log('TopTakesScreen: fetching prompt and top takes');
      loadPromptAndTopTakes().finally(() => {
        fetchInProgress.current = false;
      });
    }
  }, [user, isAppBlocked]);

  const loadPromptAndTopTakes = async () => {
    setLoading(true);
    try {
      // Always use UTC date
      const today = new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate()
      )).toISOString().split('T')[0];

      // Fetch today's prompt
      const { data: promptData } = await supabase
        .from('daily_prompts')
        .select('prompt_text')
        .eq('prompt_date', today)
        .single();
      setPromptText(promptData?.prompt_text || '');

      // Fetch all takes for today
      const { data, error } = await supabase
        .from('takes')
        .select('*')
        .eq('prompt_date', today);

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

      // Sort by total engagement (sum of all reactions)
      const formattedTakes = (data || []).map(take => ({
        id: take.id,
        content: take.content,
        username: take.is_anonymous ? 'Anonymous' : profileMap[take.user_id]?.username || 'Unknown',
        isAnonymous: take.is_anonymous,
        reactions: take.reactions || { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 },
        commentCount: 0,
        timestamp: take.created_at
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
        <TodaysPrompt prompt={promptText} takeCount={topTakes.length} />
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