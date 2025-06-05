import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, Flame, MessageSquare, Lock } from 'lucide-react';
import { TakeCard } from './TakeCard';
import ProfileEditModal from './ProfileEditModal';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { User as AppUser, Take as AppTake } from '@/types';
import { isPremiumTheme } from './theme-provider';
import { MonetizationModals } from './MonetizationModals';
import { useToast } from '@/hooks/use-toast';

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

type TakeWithPrompt = {
  take: AppTake;
  prompt: string;
  dayNumber: number;
};

const ProfileView: React.FC<ProfileViewProps> = ({ userId, username }) => {
  const { user } = useAppContext();
  const [userTakes, setUserTakes] = useState<AppTake[]>([]);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [takesWithPrompts, setTakesWithPrompts] = useState<TakeWithPrompt[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { toast } = useToast();

  const isOwnProfile = !userId || userId === user?.id;
  const displayUser = isOwnProfile ? (profileData || user) : profileData;

  useEffect(() => {
    loadUserData();
  }, [userId, username]);

  const loadUserData = async () => {
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

      if (!targetUserId) {
        targetUserId = user?.id;
      }

      if (!targetUserId) return;

      const { data: takes } = await supabase
        .from('takes')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      const formattedTakes = takes?.map(take => ({
        id: take.id,
        content: take.content,
        username: take.is_anonymous ? 'Anonymous' : (displayUser?.username || username || 'Unknown'),
        isAnonymous: take.is_anonymous,
        reactions: take.reactions || { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 },
        commentCount: 0,
        timestamp: take.created_at,
        prompt_date: take.prompt_date
      })) || [];

      const promptDates = [...new Set(formattedTakes.map(t => t.prompt_date))];
      const { data: prompts } = await supabase
        .from('daily_prompts')
        .select('prompt_date, prompt_text')
        .in('prompt_date', promptDates);
      const promptMap = (prompts || []).reduce((acc, p) => {
        acc[p.prompt_date] = p.prompt_text;
        return acc;
      }, {} as Record<string, string>);
      const takesWithPromptData = formattedTakes.map((take, index) => {
        const dayNumber = formattedTakes.length - index;
        return {
          take,
          prompt: promptMap[take.prompt_date] || '',
          dayNumber
        };
      });

      setUserTakes(formattedTakes);
      setTakesWithPrompts(takesWithPromptData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (takeId: string, reaction: keyof AppTake['reactions']) => {
    setUserTakes(prev => prev.map(t => 
      t.id === takeId ? { 
        ...t, 
        reactions: {
          ...t.reactions,
          [reaction]: t.reactions[reaction] + 1
        }
      } : t
    ));
    setTakesWithPrompts(prev => prev.map(item => 
      item.take.id === takeId ? {
        ...item,
        take: {
          ...item.take,
          reactions: {
            ...item.take.reactions,
            [reaction]: item.take.reactions[reaction] + 1
          }
        }
      } : item
    ));
    const take = userTakes.find(t => t.id === takeId);
    if (!take) return;
    const updatedReactions = {
      ...take.reactions,
      [reaction]: take.reactions[reaction] + 1
    };
    await supabase
      .from('takes')
      .update({ reactions: updatedReactions })
      .eq('id', takeId);
    // Log the reaction event
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
    // Update theme_id in Supabase and local state
    await supabase.from('profiles').update({ theme_id: themeId }).eq('id', currentUser.id);
    setProfileData((prev: ProfileData | null) => ({ ...prev, theme_id: themeId }));
    toast({ title: 'Theme Changed', description: `Theme set to ${themeId.replace('_', ' ')}` });
  };

  const handlePremiumPurchase = async () => {
    // Update isPremium in Supabase and local state
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
                  {userTakes.length} takes
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

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-brand-text">
          {isOwnProfile ? '📝 Your Takes' : `📝 ${currentUser.username}'s Takes`}
        </h3>
        {isPrivate ? (
          <Card className="bg-brand-surface border-brand-border">
            <CardContent className="text-center py-8">
              <p className="text-brand-muted">🔒 This profile is private</p>
            </CardContent>
          </Card>
        ) : takesWithPrompts.length === 0 ? (
          <Card className="bg-brand-surface border-brand-border">
            <CardContent className="text-center py-8">
              <p className="text-brand-muted">
                {isOwnProfile ? "You haven't posted any takes yet!" : "No takes posted yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          takesWithPrompts.map((item) => (
            <TakeCard 
              key={item.take.id} 
              take={item.take} 
              onReact={handleReaction}
              showPrompt={true}
              promptText={item.prompt}
              dayNumber={item.dayNumber}
            />
          ))
        )}
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