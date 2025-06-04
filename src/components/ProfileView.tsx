import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings } from 'lucide-react';
import { TakeCard } from './TakeCard';
import ProfileEditModal from './ProfileEditModal';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { Take } from '@/types';

interface ProfileViewProps {
  userId?: string;
  username?: string;
}

const ProfileView: React.FC<ProfileViewProps> = ({ userId, username }) => {
  const { user } = useAppContext();
  const [userTakes, setUserTakes] = useState<Take[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [takesWithPrompts, setTakesWithPrompts] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const handleReaction = (takeId: string, reaction: keyof Take['reactions']) => {
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
  };

  const handleProfileUpdate = (updatedProfile: any) => {
    setProfileData(updatedProfile);
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
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-20 h-20">
              {currentUser.avatar_url ? (
                <AvatarImage src={currentUser.avatar_url} alt={currentUser.username} />
              ) : (
                <AvatarFallback className="bg-purple-600 text-white text-2xl">
                  {(currentUser.username || 'U')[0].toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <CardTitle className="text-2xl text-white">
                {currentUser.username || 'Unknown User'}
              </CardTitle>
              {currentUser.full_name && (
                <p className="text-gray-400 mt-1">{currentUser.full_name}</p>
              )}
              {currentUser.bio && (
                <p className="text-gray-300 mt-2 text-sm max-w-md mx-auto">{currentUser.bio}</p>
              )}
              <div className="flex justify-center space-x-4 mt-3">
                <Badge variant="outline" className="text-purple-400 border-purple-400">
                  🔥 {currentUser.streak || 0} day streak
                </Badge>
                <Badge variant="outline" className="text-purple-400 border-purple-400">
                  📝 {userTakes.length} takes
                </Badge>
                {isPrivate && (
                  <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                    🔒 Private
                  </Badge>
                )}
              </div>
              {isOwnProfile && (
                <Button
                  onClick={() => setIsEditModalOpen(true)}
                  variant="outline"
                  size="sm"
                  className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-700"
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
        <h3 className="text-xl font-semibold text-white">
          {isOwnProfile ? '📝 Your Takes' : `📝 ${currentUser.username}'s Takes`}
        </h3>
        {isPrivate ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="text-center py-8">
              <p className="text-gray-400">🔒 This profile is private</p>
            </CardContent>
          </Card>
        ) : takesWithPrompts.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="text-center py-8">
              <p className="text-gray-400">
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