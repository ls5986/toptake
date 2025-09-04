import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Edit3, LogOut, Flame, FileText, MoreVertical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import ProfileEditModal from './ProfileEditModal';
import { TakeCard } from './TakeCard';
import { ThemeSelector } from './ThemeSelector';
import { useTheme } from '@/components/theme-provider';
import { MonetizationModals } from './MonetizationModals';
import ThemeStoreModal from './ThemeStoreModal';
import { TodaysPrompt } from './TodaysPrompt';
import { Take } from '@/types';
import { useAppContext } from '@/contexts/AppContext';
import { useTodayPrompt } from '@/hooks/useTodayPrompt';

interface ProfileViewProps {
  userId?: string;
}

const ProfileView: React.FC<ProfileViewProps> = ({ userId }) => {
  const { user, logout } = useAppContext();
  const [isPrivateProfile, setIsPrivateProfile] = useState(false);
  const [selectedDate] = useState(new Date());
  const [userTakes, setUserTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const { setTheme } = useTheme();
  const [showStore, setShowStore] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalTakes, setTotalTakes] = useState(0);
  const [hasPostedForSelectedDate, setHasPostedForSelectedDate] = useState(false);
  const { toast } = useToast();
  
  // Profile is not date-specific for prompt display; omit prompt

  const targetUserId = userId || user?.id;

  useEffect(() => {
    if (targetUserId) {
      loadUserData();
      fetchUserTakes();
      loadAccurateCounts();
    }
  }, [targetUserId]);

  const localDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatDateWithOffset = (date: Date, offsetMinutes: number | undefined) => {
    const ms = date.getTime() + (offsetMinutes || 0) * 60000;
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fetchUserTakes = async () => {
    if (!targetUserId) return;
    try {
      const { data: takesData } = await supabase
        .from('takes')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });
      
      if (takesData) {
        // Format takes to match Take type
        const formattedTakes: Take[] = takesData.map((take: any) => ({
          id: take.id,
          userId: take.user_id,
          content: take.content,
          username: take.is_anonymous ? 'Anonymous' : (take.username || 'Unknown'),
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
    if (!targetUserId) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();
      if (profile) {
        // Use stored streak as a fallback only; accurate streak is computed below
        setStreak(profile.current_streak || 0);
        setCurrentTheme(profile.theme_id || 'light');
        setIsPrivateProfile(!!profile.is_private);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccurateCounts = async () => {
    if (!user?.id) return;
    try {
      // Accurate takes count
      const { count } = await supabase
        .from('takes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', targetUserId);
      setTotalTakes(count || 0);

      // Accurate streak computed from distinct prompt_date values up to last 60 days
      const { data: dateRows, error } = await supabase
        .from('takes')
        .select('prompt_date')
        .eq('user_id', targetUserId)
        .order('prompt_date', { ascending: false })
        .limit(90);
      if (error) throw error;
      const dates = new Set<string>((dateRows || []).map(r => r.prompt_date));
      const offset = user?.timezone_offset || 0;
      let current = new Date();
      let s = 0;
      // Walk back day by day until a gap
      while (true) {
        const key = formatDateWithOffset(current, offset);
        if (dates.has(key)) {
          s += 1;
          current.setDate(current.getDate() - 1);
        } else {
          break;
        }
      }
      setStreak(s);
    } catch (err) {
      console.error('Error loading accurate counts:', err);
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
    setShowEditProfile(true);
  };

  const setShowEditProfile = (val: boolean) => setShowEditModal(val);

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
              {isPrivateProfile && (
                <div className="text-xs text-brand-muted mt-1">Private profile</div>
              )}
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
              <div className="mt-2 flex justify-center gap-3">
                <button
                  className="text-sm text-brand-muted hover:text-brand-accent underline"
                  onClick={async () => {
                    const url = `${window.location.origin}/?profile=${targetUserId}`;
                    try {
                      if ((navigator as any).share) {
                        await (navigator as any).share({ title: 'TopTake', text: 'Check out this profile', url });
                      } else {
                        await navigator.clipboard.writeText(url);
                        (useToast() as any).toast?.({ title: 'Link copied' });
                      }
                    } catch {}
                  }}
                >
                  Share Profile
                </button>
                <button
                  className="text-sm text-brand-muted hover:text-brand-text p-1 border rounded px-2"
                  onClick={async () => {
                    // simple follow toggle
                    try {
                      await supabase.from('follows').insert({ follower_id: user?.id, followee_id: targetUserId }).select();
                    } catch {}
                  }}
                >
                  Follow
                </button>
                <button
                  className="text-sm text-brand-danger hover:text-brand-text p-1 border rounded px-2"
                  onClick={async () => {
                    try { await supabase.from('blocks').insert({ blocker_id: user?.id, blocked_id: targetUserId }).select(); } catch {}
                  }}
                >
                  Block
                </button>
              </div>
              <div className="mt-4 w-full max-w-2xl mx-auto">
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={() => { setTheme('light' as any); setCurrentTheme('light'); }}>Light</Button>
                  <Button variant="outline" onClick={() => { setTheme('dark' as any); setCurrentTheme('dark'); }}>Dark</Button>
                  <Button variant="outline" onClick={() => setShowStore(true)}>Trippy</Button>
                </div>
                <p className="text-xs text-brand-muted mt-2 text-center">Trippy includes premium themes.</p>
              </div>
              <Button
                onClick={() => setShowEditProfile(true)}
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
      
      {/* No date-specific prompt on profile */}

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
      {showStore && (
        <ThemeStoreModal isOpen={showStore} onClose={() => setShowStore(false)} />
      )}
    </div>
  );
};

export default ProfileView;