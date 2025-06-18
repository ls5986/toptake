import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, Flame, MessageSquare, Lock, CalendarIcon } from 'lucide-react';
import { TakeCard } from './TakeCard';
import ProfileEditModal from './ProfileEditModal';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { User as AppUser, Take as AppTake } from '@/types';
import { isPremiumTheme } from './theme-provider';
import { MonetizationModals } from './MonetizationModals';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePromptForDate } from '@/hooks/usePromptForDate';

interface ProfileViewProps {
  userId?: string;
  username?: string;
}

type ProfileData = AppUser & {
  avatar_url?: string;
  bio?: string;
  full_name?: string;
  is_private?: boolean;
  theme_id?: string;
};

const ProfileView: React.FC<ProfileViewProps> = ({ userId, username }) => {
  const { user } = useAppContext();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { promptText, loading: promptLoading } = usePromptForDate(selectedDate);
  const [userTake, setUserTake] = useState<AppTake | null>(null);

  const isOwnProfile = !userId || userId === user?.id;
  const displayUser = isOwnProfile ? (profileData || user) : profileData;

  useEffect(() => {
    loadUserData();
  }, [userId, username]);

  useEffect(() => {
    if (!displayUser?.id) return;
    const fetchUserTake = async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const { data: takeData } = await supabase
        .from('takes')
        .select('*')
        .eq('user_id', displayUser.id)
        .eq('prompt_date', dateStr)
        .single();
      setUserTake(takeData || null);
    };
    fetchUserTake();
  }, [selectedDate, displayUser]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      let targetUserId = userId;
      if (!targetUserId && username) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single();
        if (profile) {
          targetUserId = profile.id;
          setProfileData(profile);
        }
      } else if (!isOwnProfile && targetUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .single();
        setProfileData(profile);
      } else if (isOwnProfile && user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfileData(profile);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (takeId: string, reaction: keyof AppTake['reactions']) => {
    if (!userTake) return;
    setUserTake(prev => prev ? {
      ...prev,
      reactions: {
        ...prev.reactions,
        [reaction]: prev.reactions[reaction] + 1
      }
    } : prev);
    const updatedReactions = {
      ...userTake.reactions,
      [reaction]: userTake.reactions[reaction] + 1
    };
    await supabase
      .from('takes')
      .update({ reactions: updatedReactions })
      .eq('id', takeId);
    if (user) {
      await supabase.from('take_reactions').upsert({
        take_id: takeId,
        actor_id: user.id,
        reaction_type: reaction,
        created_at: new Date().toISOString(),
      });
    }
  };

  const handleProfileUpdate = (updatedProfile: ProfileData) => {
    setProfileData(updatedProfile);
  };

  const availableThemes = [
    { id: 'light', name: 'Light', premium: false },
    { id: 'dark', name: 'Dark', premium: false },
    { id: 'orange_glow', name: 'Orange Glow', premium: true },
  ];

  const handleThemeSelect = async (themeId: string, premium: boolean) => {
    if (premium && !currentUser.isPremium) {
      setShowPremiumModal(true);
      return;
    }
    await supabase.from('profiles').update({ theme_id: themeId }).eq('id', currentUser.id);
    setProfileData((prev: ProfileData | null) => ({ ...prev, theme_id: themeId }));
    toast({ title: 'Theme Changed', description: `Theme set to ${themeId.replace('_', ' ')}` });
  };

  const handlePremiumPurchase = async () => {
    await supabase.from('profiles').update({ is_premium: true }).eq('id', currentUser.id);
    setProfileData((prev: ProfileData | null) => ({ ...prev, isPremium: true }));
    toast({ title: 'Premium Unlocked!', description: 'You now have access to all premium features and themes.' });
  };

  if (loading) {
    return (
      <div className="text-center text-white py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  const currentUser = displayUser || { username: username || 'Unknown', streak: 0 };
  const isPrivate = !isOwnProfile && profileData?.is_private;

  return (
    <div className="space-y-6">
      <Card className="bg-brand-surface border-brand-border">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-20 h-20">
              {currentUser.avatar_url ? (
                <AvatarImage src={currentUser.avatar_url} alt={currentUser.username} />
              ) : (
                <AvatarFallback className="bg-brand-primary text-brand-text text-2xl">
                  {(currentUser.username || 'U')[0].toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-2xl text-brand-text">
                {currentUser.username || 'Unknown User'}
              </CardTitle>
              {currentUser.full_name && (
                <p className="text-brand-muted mt-1">{currentUser.full_name}</p>
              )}
              {currentUser.bio && (
                <p className="text-brand-muted mt-2 text-sm max-w-md mx-auto">{currentUser.bio}</p>
              )}
              <div className="flex justify-center space-x-4 mt-3">
                <Badge variant="outline" className="text-brand-primary border-brand-primary flex items-center gap-1">
                  <Flame className="w-4 h-4 text-brand-primary" />
                  {currentUser.streak || 0} day streak
                </Badge>
                <Badge variant="outline" className="text-brand-accent border-brand-accent flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 text-brand-accent" />
                  {/* Only show take count for selected date if take exists */}
                  {userTake ? 1 : 0} takes
                </Badge>
                {isPrivate && (
                  <Badge variant="outline" className="text-brand-muted border-brand-muted flex items-center gap-1">
                    <Lock className="w-4 h-4 text-brand-muted" />
                    Private
                  </Badge>
                )}
              </div>
              <div className="mt-4">
                <div className="font-semibold text-brand-text mb-2">Theme</div>
                <div className="flex gap-2 justify-center">
                  {availableThemes.map(theme => (
                    <Button
                      key={theme.id}
                      onClick={() => handleThemeSelect(theme.id, theme.premium)}
                      className={`px-3 py-1 rounded-full border ${profileData?.theme_id === theme.id ? 'border-brand-accent' : 'border-brand-border'} ${theme.id === 'orange_glow' ? 'bg-gradient-to-r from-orange-300 to-orange-500 text-orange-900' : ''}`}
                      disabled={profileData?.theme_id === theme.id}
                    >
                      {theme.name}
                      {theme.premium && !currentUser.isPremium && (
                        <Lock className="inline w-4 h-4 ml-1 text-brand-danger" />
                      )}
                    </Button>
                  ))}
                </div>
                <MonetizationModals
                  showAnonymousModal={false}
                  showStreakModal={false}
                  showPremiumModal={showPremiumModal}
                  showBoostModal={false}
                  onClose={() => setShowPremiumModal(false)}
                  onPurchase={(type) => {
                    if (type === 'premium') handlePremiumPurchase();
                  }}
                />
              </div>
              {isOwnProfile && (
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="mt-4 border-brand-border text-brand-muted hover:bg-brand-surface/80"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Date Picker and Prompt/Take for selected date */}
      <div className="space-y-4">
        <div className="flex items-center justify-between sticky top-0 bg-brand-surface py-2 z-10">
          <h3 className="text-xl font-semibold text-brand-text flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            {format(selectedDate, 'MMM dd, yyyy')}
          </h3>
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
        </div>
        <Card className="bg-card-gradient">
          <CardContent className="p-6">
            <div className="mb-4">
              <span className="font-semibold text-brand-accent">Prompt</span>
              <div className="mt-2 text-brand-text">
                {promptLoading ? (
                  <span>Loading prompt...</span>
                ) : promptText ? (
                  promptText
                ) : (
                  <span className="text-brand-danger">No prompt found for this date!</span>
                )}
              </div>
            </div>
            <div>
              <span className="font-semibold text-brand-accent">Your Take</span>
              <div className="mt-2">
                {userTake ? (
                  <TakeCard 
                    take={userTake} 
                    onReact={handleReaction}
                    showPrompt={false}
                  />
                ) : (
                  <div className="text-brand-muted">No take posted for this prompt.</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profile={currentUser}
        onUpdate={handleProfileUpdate}
      />
    </div>
  );
};

export default ProfileView;