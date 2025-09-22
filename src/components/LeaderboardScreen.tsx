import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { Flame, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface LeaderboardUser {
  id: string;
  username: string;
  current_streak: number;
  avatar_url?: string;
}

const LeaderboardScreen: React.FC = () => {
  const { setCurrentScreen, setSelectedProfile } = useAppContext();
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Get real users with their current streaks
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, current_streak')
        .order('current_streak', { ascending: false });

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        setLeaderboard([]);
        return;
      }

      // Calculate actual streaks for real users based on consecutive daily takes
      const realUsersWithStreaks = await Promise.all(
        (profiles || []).map(async (profile) => {
          // Get user's takes ordered by date
          const { data: takesData } = await supabase
            .from('takes')
            .select('created_at')
            .eq('user_id', profile.id)
            .order('created_at', { ascending: false });
          
          // Calculate current streak
          let currentStreak = 0;
          if (takesData && takesData.length > 0) {
            const today = new Date();
            const dates = takesData.map(take => new Date(take.created_at).toDateString());
            const uniqueDates = [...new Set(dates)];
            
            // Check if user posted today or yesterday to start counting
            const todayStr = today.toDateString();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();
            
            if (uniqueDates.includes(todayStr) || uniqueDates.includes(yesterdayStr)) {
              currentStreak = 1;
              
              // Count consecutive days backwards
              for (let i = 1; i < uniqueDates.length; i++) {
                const currentDate = new Date(uniqueDates[i-1]);
                const nextDate = new Date(uniqueDates[i]);
                const dayDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
                
                if (dayDiff === 1) {
                  currentStreak++;
                } else {
                  break;
                }
              }
            }
          }
          
          // Update the database with the correct streak
          await supabase
            .from('profiles')
            .update({ current_streak: currentStreak })
            .eq('id', profile.id);
          
          return {
            ...profile,
            current_streak: currentStreak
          };
        })
      );

      // Sort by streak descending
      const sortedUsers = realUsersWithStreaks.sort((a, b) => b.current_streak - a.current_streak);
      setLeaderboard(sortedUsers);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = (user: LeaderboardUser) => {
    // Prefer route-based navigation to specific username when available
    if (user.username) {
      navigate('/' + encodeURIComponent(user.username));
      return;
    }
    setSelectedProfile(user.id);
    setCurrentScreen('profile');
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Flame className="w-6 h-6 text-brand-primary" title="Top Streak" />;
    if (index === 1) return <Flame className="w-6 h-6 text-brand-accent" title="Second Place" />;
    if (index === 2) return <Flame className="w-6 h-6 text-brand-muted" title="Third Place" />;
    return <User className="w-6 h-6 text-brand-muted" title={`Rank ${index + 1}`} />;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-brand-background">
      <div className="sticky top-0 bg-brand-surface z-10 px-3 py-2 border-b border-brand-border/70">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wide text-brand-muted flex items-center gap-1">
            <Flame className="w-4 h-4 text-brand-primary" />
            <span>Streaks</span>
            <span className="text-brand-text/80 ml-1">{leaderboard.length}</span>
          </div>
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {leaderboard.map((user, index) => (
            <Card 
              key={user.id} 
              className={`bg-brand-surface border-brand-border transition-all duration-200 cursor-pointer hover:border-brand-primary ${index < 3 ? 'ring-1 ring-brand-primary/30' : ''}`}
              onClick={() => handleUserClick(user)}
            >
              <CardContent className="p-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="min-w-[2.5rem] flex-shrink-0 flex items-center justify-center">
                      {getRankIcon(index)}
                    </div>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="bg-brand-primary text-brand-text text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <span className="text-brand-text font-medium truncate block">
                        {user.username}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1 text-brand-primary font-bold text-lg">
                      <Flame className="w-4 h-4 text-brand-primary" />
                      {user.current_streak}
                    </div>
                    <div className="text-brand-muted text-xs">
                      {user.current_streak === 1 ? 'day' : 'days'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {leaderboard.length === 0 && (
          <div className="text-center text-brand-muted py-8">
            <p>No users found.</p>
            <p className="text-sm mt-2">Start posting to build your streak!</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default LeaderboardScreen;