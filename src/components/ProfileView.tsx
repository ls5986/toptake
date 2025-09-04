import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Edit3, LogOut, Flame, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { logClientEvent } from '@/lib/utils';
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
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [followersSample, setFollowersSample] = useState<any[]>([]);
  const [followingSample, setFollowingSample] = useState<any[]>([]);
  const [followBusy, setFollowBusy] = useState<Record<string, boolean>>({});
  const [profileUser, setProfileUser] = useState<any>(null);
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
  const viewingOwnProfile = !!user?.id && targetUserId === user.id;

  useEffect(() => {
    if (targetUserId) {
      loadUserData();
      fetchUserTakes();
      loadAccurateCounts();
      loadFollowStats();
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
        .select('id, user_id, content, created_at, prompt_date, is_anonymous, profiles(username)')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });
      
      if (takesData) {
        const takeIds = takesData.map((t: any) => t.id);
        let reactionsMap: Record<string, number> = {};
        let commentsMap: Record<string, number> = {};
        if (takeIds.length) {
          const { data: rx } = await supabase
            .from('take_reactions')
            .select('take_id')
            .in('take_id', takeIds);
          (rx || []).forEach((r: any) => { reactionsMap[r.take_id] = (reactionsMap[r.take_id] || 0) + 1; });
          const { data: cm } = await supabase
            .from('comments')
            .select('take_id')
            .in('take_id', takeIds);
          (cm || []).forEach((c: any) => { commentsMap[c.take_id] = (commentsMap[c.take_id] || 0) + 1; });
        }

        const formattedTakes: Take[] = takesData.map((take: any) => ({
          id: take.id,
          userId: take.user_id,
          content: take.content,
          username: take.is_anonymous ? 'Anonymous' : (take.profiles?.username || 'Unknown'),
          isAnonymous: take.is_anonymous,
          timestamp: take.created_at,
          prompt_date: take.prompt_date,
          commentCount: commentsMap[take.id] || 0,
          reactionCount: reactionsMap[take.id] || 0
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
        setProfileUser(profile);
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

  const loadFollowStats = async () => {
    if (!targetUserId) return;
    try {
      // Counts
      const { count: followersCnt } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('followee_id', targetUserId);
      const { count: followingCnt } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', targetUserId);
      setFollowerCount(followersCnt || 0);
      setFollowingCount(followingCnt || 0);

      // Status for current viewer
      if (user?.id && user.id !== targetUserId) {
        const { data: meFollows } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('followee_id', targetUserId)
          .maybeSingle();
        setIsFollowing(!!meFollows);
      } else {
        setIsFollowing(false);
      }

      // Samples for compact UI
      const { data: follRows } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followee_id', targetUserId)
        .limit(6);
      const follIds = (follRows || []).map(r => r.follower_id);
      const { data: follProfiles } = follIds.length
        ? await supabase.from('profiles').select('id, username, avatar_url').in('id', follIds)
        : { data: [] } as any;
      setFollowersSample(follProfiles || []);

      const { data: ingRows } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', targetUserId)
        .limit(6);
      const ingIds = (ingRows || []).map(r => r.followee_id);
      const { data: ingProfiles } = ingIds.length
        ? await supabase.from('profiles').select('id, username, avatar_url').in('id', ingIds)
        : { data: [] } as any;
      setFollowingSample(ingProfiles || []);
    } catch (e) {
      // ignore
    }
  };

  const openFollowers = async () => {
    setFollowersOpen(true);
    try {
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followee_id', targetUserId);
      const ids = (data || []).map(r => r.follower_id);
      if (!ids.length) { setFollowers([]); return; }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', ids);
      setFollowers(profiles || []);
    } catch {}
  };

  const openFollowing = async () => {
    setFollowingOpen(true);
    try {
      const { data } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', targetUserId);
      const ids = (data || []).map(r => r.followee_id);
      if (!ids.length) { setFollowing([]); return; }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', ids);
      setFollowing(profiles || []);
    } catch {}
  };

  const toggleFollow = async () => {
    if (!user?.id || !targetUserId || user.id === targetUserId) return;
    try {
      if (isFollowing) {
        if (!window.confirm('Unfollow this user?')) return;
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('followee_id', targetUserId);
        setIsFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
      } else {
        await supabase
          .from('follows')
          .insert({ follower_id: user.id, followee_id: targetUserId });
        setIsFollowing(true);
        setFollowerCount(c => c + 1);
      }
    } catch {}
  };

  const toggleFollowForId = async (otherId: string, currentlyFollowing: boolean) => {
    if (!user?.id || !otherId || user.id === otherId) return;
    try {
      setFollowBusy(prev => ({ ...prev, [otherId]: true }));
      if (currentlyFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('followee_id', otherId);
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, followee_id: otherId });
      }
      await openFollowers();
      await openFollowing();
      await loadFollowStats();
    } catch {}
    finally {
      setFollowBusy(prev => ({ ...prev, [otherId]: false }));
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
                {(profileUser?.username || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <CardTitle className="text-2xl text-brand-text">
                {profileUser?.username || 'Unknown User'}
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
                    const url = `${window.location.origin}/${profileUser?.username || targetUserId}`;
                    try { logClientEvent('share_profile', { username: profileUser?.username || null, targetUserId, url }); } catch {}
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
                {user?.id !== targetUserId && (
                  <button
                    className="text-sm p-1 border rounded px-2 \n                      "
                    onClick={toggleFollow}
                  >
                    {isFollowing ? 'Unfollow' : 'Follow'}
                  </button>
                )}
                {user?.id !== targetUserId && (
                  <button
                    className="text-sm text-brand-danger hover:text-brand-text p-1 border rounded px-2"
                    onClick={async () => {
                      if (!window.confirm('Block this user? They will not be able to follow or view your profile.')) return;
                      try { await supabase.from('blocks').insert({ blocker_id: user?.id, blocked_id: targetUserId }).select(); } catch {}
                    }}
                  >
                    Block
                  </button>
                )}
              </div>

              <div className="mt-2 flex justify-center gap-4 text-sm">
                <button className="text-brand-muted hover:text-brand-text" onClick={openFollowers}>
                  Followers {followerCount}
                </button>
                <button className="text-brand-muted hover:text-brand-text" onClick={openFollowing}>
                  Following {followingCount}
                </button>
              </div>

              {/* Compact avatar rows */}
              <div className="mt-3 grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div>
                  <div className="text-xs text-brand-muted mb-1">Followers</div>
                  <div className="flex flex-wrap gap-2">
                    {followersSample.map(p => (
                      <div key={p.id} className="flex items-center gap-2 border border-brand-border rounded-full px-2 py-1">
                        <img src={p.avatar_url || ''} alt="avatar"
                          className="w-6 h-6 rounded-full bg-brand-muted object-cover"
                          onError={(e:any)=>{e.currentTarget.style.display='none';}} />
                        <span className="text-xs text-brand-text">{p.username || 'Unknown'}</span>
                        {user?.id && user.id !== p.id && (
                          <button
                            className="text-[11px] border rounded px-2"
                            disabled={!!followBusy[p.id]}
                            onClick={async () => {
                              // If I already follow p?
                              const { data } = await supabase
                                .from('follows')
                                .select('id')
                                .eq('follower_id', user.id)
                                .eq('followee_id', p.id)
                                .maybeSingle();
                              await toggleFollowForId(p.id, !!data);
                            }}
                          >
                            {followBusy[p.id] ? '...' : 'Follow'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-brand-muted mb-1">Following</div>
                  <div className="flex flex-wrap gap-2">
                    {followingSample.map(p => (
                      <div key={p.id} className="flex items-center gap-2 border border-brand-border rounded-full px-2 py-1">
                        <img src={p.avatar_url || ''} alt="avatar"
                          className="w-6 h-6 rounded-full bg-brand-muted object-cover"
                          onError={(e:any)=>{e.currentTarget.style.display='none';}} />
                        <span className="text-xs text-brand-text">{p.username || 'Unknown'}</span>
                        {user?.id && user.id === targetUserId && (
                          <button
                            className="text-[11px] border rounded px-2"
                            disabled={!!followBusy[p.id]}
                            onClick={async () => {
                              await toggleFollowForId(p.id, true);
                            }}
                          >
                            {followBusy[p.id] ? '...' : 'Unfollow'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Followers Modal */}
              <Dialog open={followersOpen} onOpenChange={setFollowersOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Followers</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {followers.length === 0 ? (
                      <div className="text-brand-muted text-sm">No followers yet.</div>
                    ) : (
                      followers.map((p) => (
                        <div key={p.id} className="flex items-center justify-between border border-brand-border rounded p-2">
                          <div className="flex items-center gap-2">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="avatar" className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-brand-muted flex items-center justify-center text-brand-primary font-bold">
                                {p.username?.[0] || '?'}
                              </div>
                            )}
                            <span className="text-brand-text text-sm">{p.username || 'Unknown'}</span>
                          </div>
                          {user?.id && user.id !== p.id && (
                            <button
                              className="text-xs border rounded px-2 py-1"
                              onClick={async () => {
                                // determine if current user follows p
                                const { data } = await supabase
                                  .from('follows')
                                  .select('id')
                                  .eq('follower_id', user.id)
                                  .eq('followee_id', p.id)
                                  .maybeSingle();
                                await toggleFollowForId(p.id, !!data);
                              }}
                            >
                              Follow/Unfollow
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Following Modal */}
              <Dialog open={followingOpen} onOpenChange={setFollowingOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Following</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {following.length === 0 ? (
                      <div className="text-brand-muted text-sm">Not following anyone yet.</div>
                    ) : (
                      following.map((p) => (
                        <div key={p.id} className="flex items-center justify-between border border-brand-border rounded p-2">
                          <div className="flex items-center gap-2">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="avatar" className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-brand-muted flex items-center justify-center text-brand-primary font-bold">
                                {p.username?.[0] || '?'}
                              </div>
                            )}
                            <span className="text-brand-text text-sm">{p.username || 'Unknown'}</span>
                          </div>
                          {user?.id && user.id !== p.id && (
                            <button
                              className="text-xs border rounded px-2 py-1"
                              onClick={async () => {
                                // current user already follows p (since list is following); toggle will unfollow
                                await toggleFollowForId(p.id, true);
                              }}
                            >
                              Unfollow
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <div className="mt-4 w-full max-w-2xl mx-auto">
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={() => { setTheme('light' as any); setCurrentTheme('light'); }}>Light</Button>
                  <Button variant="outline" onClick={() => { setTheme('dark' as any); setCurrentTheme('dark'); }}>Dark</Button>
                  <Button variant="outline" onClick={() => setShowStore(true)}>Trippy</Button>
                </div>
                <p className="text-xs text-brand-muted mt-2 text-center">Trippy includes premium themes.</p>
              </div>
              {viewingOwnProfile && (
                <>
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
                </>
              )}
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
        <h3 className="text-lg font-semibold text-brand-text mb-4">{viewingOwnProfile ? 'Your Takes' : 'Takes'}</h3>
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
            <p>No takes posted yet.</p>
            {viewingOwnProfile && <p className="text-sm mt-2">Share your thoughts to get started!</p>}
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