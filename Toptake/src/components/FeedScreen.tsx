import React, { useState, useEffect } from 'react';
import { TakeCard } from './TakeCard';
import { AppBlocker } from './AppBlocker';
import { TodaysPrompt } from './TodaysPrompt';
import { Take } from '@/types';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const FeedScreen: React.FC = () => {
  const { user, isAppBlocked, setIsAppBlocked, checkDailyPost, hasPostedToday } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [takes, setTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user && !isAppBlocked) {
      loadPromptAndTakes();
    }
  }, [user, isAppBlocked, selectedDate]);

  const loadPromptAndTakes = async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data: promptData } = await supabase
        .from('daily_prompts')
        .select('prompt_text')
        .eq('prompt_date', dateStr)
        .single();
      
      setCurrentPrompt(promptData?.prompt_text || 'No prompt available for this date');
      
      const { data: takesData } = await supabase
        .from('takes')
        .select(`*, profiles!inner(username)`)
        .eq('prompt_date', dateStr)
        .order('created_at', { ascending: false });

      const formattedTakes = (takesData || []).map(take => ({
        id: take.id,
        content: take.content,
        username: take.is_anonymous ? 'Anonymous' : take.profiles?.username || 'Unknown',
        isAnonymous: take.is_anonymous,
        reactions: take.reactions || { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 },
        commentCount: 0,
        timestamp: take.created_at
      }));

      setTakes(formattedTakes);
    } catch (error) {
      console.error('Error loading data:', error);
      setTakes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleReaction = async (takeId: string, reaction: keyof Take['reactions']) => {
    try {
      const currentTake = takes.find(t => t.id === takeId);
      if (!currentTake) return;

      const newReactions = {
        ...currentTake.reactions,
        [reaction]: (currentTake.reactions[reaction] || 0) + 1
      };

      setTakes(prev => prev.map(t => 
        t.id === takeId ? { ...t, reactions: newReactions } : t
      ));

      await supabase
        .from('takes')
        .update({ reactions: newReactions })
        .eq('id', takeId);

      toast({ title: `Reacted!`, duration: 1000 });
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPromptAndTakes();
  };

  const handleUnlock = async () => {
    setIsAppBlocked(false);
    await checkDailyPost();
    await loadPromptAndTakes();
  };

  if (isAppBlocked) {
    return <AppBlocker isBlocked={isAppBlocked} onSubmit={handleUnlock} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-shrink-0">
        <TodaysPrompt prompt={currentPrompt} takeCount={takes.length} selectedDate={selectedDate} />
      </div>
      
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
              <p>Loading takes...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between sticky top-0 bg-gray-900 py-2 z-10">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-semibold text-white">
                    💬 Takes ({takes.length})
                  </h2>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(selectedDate, 'MMM dd, yyyy')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
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
              
              {takes.map((take) => (
                <TakeCard key={take.id} take={take} onReact={handleReaction} />
              ))}
              
              {takes.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <p>No takes for {format(selectedDate, 'MMM dd, yyyy')}</p>
                  <p className="text-sm mt-2">Try a different date</p>
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