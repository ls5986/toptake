import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Edit3, LogOut, Flame, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import ProfileEditModal from './ProfileEditModal';
import { TakeCard } from './TakeCard';
import { TodaysPrompt } from './TodaysPrompt';
import { Take } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { useTodayPrompt } from '@/hooks/useTodayPrompt';

const ProfileView: React.FC = () => {
  const { user, logout } = useAppContext();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [userTakes, setUserTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const [streak, setStreak] = useState(0);
  const [totalTakes, setTotalTakes] = useState(0);
  const [hasPostedForSelectedDate, setHasPostedForSelectedDate] = useState(false);
  const { toast } = useToast();
  
  // Use the same prompt hook as other components for consistency
  const { prompt, loading: promptLoading } = useTodayPrompt();
  
  // Get prompt text for display - use today's prompt for consistency
  const promptText = prompt?.prompt_text || '';

  useEffect(() => {
    if (user?.id) {
      loadUserData();
      fetchUserTakes();
    }
  }, [user?.id, selectedDate]);

  const fetchUserTakes = async () => {
    if (!user?.id) return;
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data: takesData } = await supabase
        .from('takes')
        .select('*')
        .eq('user_id', user.id)
        .eq('prompt_date', dateStr)
        .order('created_at', { ascending: false });
      
      if (takesData) {
        // Format takes to match Take type
        const formattedTakes: Take[] = takesData.map((take: any) => ({
          id: take.id,
          userId: take.user_id,
          content: take.content,
          username: take.is_anonymous ? 'Anonymous' : user.username || 'Unknown',
          isAnonymous: take.is_anonymous,
          timestamp: take.created_at,
          prompt_date: take.prompt_date,
          commentCount: 0
        }));
        
        setUserTakes(formattedTakes);
        setHasPostedForSelectedDate(formattedTakes.length > 0);
      }
    } catch (error) {
      console.error('Error fetching user takes:', error);
    }
  };

  const loadUserData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profile) {
        setStreak(profile.streak || 0);
        setTotalTakes(profile.total_takes || 0);
        setCurrentTheme(profile.theme_id || 'light');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (takeId: string, reaction: string) => {
    // Simplified reaction handling - just log for now
    console.log('Reaction:', reaction, 'on take:', takeId);
  };

  const handleLogout = () => {
    logout();
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-brand-text">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full p-4 space-y-6">
      {/* Profile Card */}
      <Card className="bg-card-gradient">
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-brand-primary text-brand-text text-2xl">
                {(user?.username || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <CardTitle className="text-2xl text-brand-text">
                {user?.username || 'Unknown User'}
              </CardTitle>
              <div className="flex justify-center space-x-4 mt-3">
                <Badge variant="outline" className="text-brand-primary border-brand-primary flex items-center gap-1">
                  <Flame className="w-4 h-4 text-brand-primary" />
                  {streak || 0} day streak
                </Badge>
                <Badge variant="outline" className="text-brand-accent border-brand-accent flex items-center gap-1">
                  <FileText className="w-4 h-4 text-brand-accent" />
                  {totalTakes || 0} takes
                </Badge>
              </div>
              <div className="mt-4">
                <div className="font-semibold text-brand-text mb-2">Theme</div>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => setCurrentTheme('light')}
                    className={`px-3 py-1 rounded-full border ${currentTheme === 'light' ? 'border-brand-accent' : 'border-brand-border'}`}
                    disabled={currentTheme === 'light'}
                  >
                    Light
                  </Button>
                  <Button
                    onClick={() => setCurrentTheme('dark')}
                    className={`px-3 py-1 rounded-full border ${currentTheme === 'dark' ? 'border-brand-accent' : 'border-border'}`}
                    disabled={currentTheme === 'dark'}
                  >
                    Dark
                  </Button>
                </div>
              </div>
              <Button
                onClick={handleEditProfile}
                variant="outline"
                size="sm"
                className="mt-4 border-brand-border text-brand-muted hover:bg-brand-surface/80"
              >
                <Edit3 className="w-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="mt-2 border-brand-border text-brand-muted hover:bg-brand-surface/80"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Log Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Prompt */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-brand-text flex items-center gap-2">
          <span>📅</span>
          {format(selectedDate, 'MMM dd, yyyy')}
        </h3>
      </div>
      
      <TodaysPrompt 
        prompt={promptText} 
        takeCount={userTakes.length} 
        loading={promptLoading}
        selectedDate={selectedDate}
      />

      {/* User's Takes */}
      <div className="flex-1 min-h-0">
        <h3 className="text-lg font-semibold text-brand-text mb-4">Your Takes</h3>
        {userTakes.length > 0 ? (
          <div className="space-y-4">
            {userTakes.map((take) => (
              <TakeCard 
                key={take.id}
                take={take} 
                onReact={handleReaction}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-brand-muted py-8">
            <p>No takes posted for this prompt yet.</p>
            <p className="text-sm mt-2">Share your thoughts to get started!</p>
          </div>
        )}
      </div>

      <ProfileEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        profile={user}
        onUpdate={() => {}}
      />
    </div>
  );
};

export default ProfileView;