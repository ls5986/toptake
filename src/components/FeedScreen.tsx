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
import { useTodayPrompt } from '@/hooks/useTodayPrompt';

const FeedScreen: React.FC = () => {
  const { user, isAppBlocked, setIsAppBlocked, checkDailyPost } = useAppContext();
  const [takes, setTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetchInProgress = useRef(false);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Use the same prompt hook as other components for consistency
  const { prompt, loading: promptLoading } = useTodayPrompt();
  
  // Get prompt text for display - use today's prompt for consistency
  const promptText = prompt?.prompt_text || '';
  
  const loadPromptAndTakes = async () => {
    setLoading(true);
    try {
      // Fetch all takes for selected date
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('takes')
        .select('*')
        .eq('prompt_date', dateStr)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('❌ FeedScreen: Error fetching takes for date:', error);
        setTakes([]);
        setLoading(false);
        return;
      }
      
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
        prompt_date: take.prompt_date,
        commentCount: commentCountMap[take.id] || 0
      }));
      
      setTakes(formattedTakes);
    } catch (error) {
      console.error('❌ FeedScreen: Error in loadPromptAndTakes:', error);
      setTakes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user && !isAppBlocked && !fetchInProgress.current) {
      fetchInProgress.current = true;
      loadPromptAndTakes().finally(() => {
        fetchInProgress.current = false;
      });
    }
  }, [user, isAppBlocked, selectedDate]);

  const handleReaction = async (takeId: string, reaction: string) => {
    // Simplified reaction handling - just log for now
    console.log('Reaction:', reaction, 'on take:', takeId);
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