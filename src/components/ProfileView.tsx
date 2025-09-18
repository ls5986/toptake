import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Edit3, LogOut, Flame, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { logClientEvent, fetchFollowStatsCached } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import ProfileEditModal from './ProfileEditModal';
import { TakeCard } from './TakeCard';
import { ThemeSelector } from './ThemeSelector';
import { useTheme } from '@/components/theme-provider';
import { getThemeColors, deriveThemeSurfaces } from '@/lib/themes';
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
  const [followActionBusy, setFollowActionBusy] = useState(false);
  const [profileUser, setProfileUser] = useState<any>(null);
  const [selectedDate] = useState(new Date());
  const [userTakes, setUserTakes] = useState<Take[]>([]);
  const [promptByDate, setPromptByDate] = useState<Record<string, string>>({});
  const [promptById, setPromptById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('light');
  const { setTheme, theme } = useTheme();
  const themePreview = getThemeColors(theme);
  const surfaces = deriveThemeSurfaces(themePreview);
  const [viewerPostedDates, setViewerPostedDates] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const [showStore, setShowStore] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalTakes, setTotalTakes] = useState(0);
  const [hasPostedForSelectedDate, setHasPostedForSelectedDate] = useState(false);
  const { toast } = useToast();
  // Some projects still have follows.followed_id; treat dynamically at runtime without probing
  const [followeeCol] = useState<'followee_id' | 'followed_id'>('followee_id');
  
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
        .select('id, user_id, content, created_at, prompt_date, prompt_id, is_anonymous, profiles(username)')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });
      
      if (takesData) {
        const takeIds = takesData.map((t: any) => t.id);
        let reactionsMap: Record<string, number> = {};
        let commentsMap: Record<string, number> = {};
        if (takeIds.length) {
          // Fetch counts efficiently using PostgREST count-only heads
          const [{ data: rx, error: rxe }] = await Promise.all([
            supabase.from('take_reactions').select('take_id', { head: false }).in('take_id', takeIds),
          ]);
          (rx || []).forEach((r: any) => { reactionsMap[r.take_id] = (reactionsMap[r.take_id] || 0) + 1; });
          const { data: cm } = await supabase.from('comments').select('take_id').in('take_id', takeIds);
          (cm || []).forEach((c: any) => { commentsMap[c.take_id] = (commentsMap[c.take_id] || 0) + 1; });
        }

        const formattedTakes: Take[] = takesData.map((take: any) => ({
          id: take.id,
          userId: take.user_id,
          content: take.content,
          username: take.is_anonymous ? 'Anonymous' : (take.profiles?.username || take.username || 'Unknown'),
          isAnonymous: take.is_anonymous,
          timestamp: take.created_at,
          prompt_date: take.prompt_date,
          commentCount: commentsMap[take.id] || 0,
          reactionCount: reactionsMap[take.id] || 0
        }));

        // Dedupe: keep only one take per prompt_date (prefer longer content; tie -> latest by timestamp)
        const normalizeYMD = (v: any) => {
          try {
            const s = String(v);
            if (s.length >= 10) return s.slice(0, 10);
            const d = new Date(v);
            if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
            return s;
          } catch { return String(v); }
        };
        const byDate = new Map<string, Take>();
        for (const t of formattedTakes) {
          const key = normalizeYMD((t as any).prompt_date);
          const prev = byDate.get(key);
          if (!prev) {
            byDate.set(key, t);
          } else {
            const prevLen = (prev.content || '').length;
            const currLen = (t.content || '').length;
            if (currLen > prevLen) {
              byDate.set(key, t);
            } else if (currLen === prevLen) {
              if (new Date(t.timestamp).getTime() > new Date(prev.timestamp).getTime()) {
                byDate.set(key, t);
              }
            }
          }
        }
        const deduped = Array.from(byDate.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Hide future-dated takes for the viewer's local day (e.g., 9/16 when today is 9/15)
        const todayYMD = localDate(new Date());
        const visible = deduped.filter((t:any) => {
          const d = String((t as any).prompt_date || '').slice(0, 10);
          if (!d) return true;
          return d <= todayYMD; // YYYY-MM-DD strings compare lexicographically
        });

        setUserTakes(visible);
        setHasPostedForSelectedDate(visible.length > 0);

        // Fetch prompt text for each distinct prompt_date shown on the profile
        const dates = Array.from(new Set((takesData || [])
          .map((t: any) => t.prompt_date)
          .filter((d:string) => !!d && String(d).slice(0,10) <= todayYMD)));
        const promptIds = Array.from(new Set((takesData || []).map((t: any) => t.prompt_id).filter(Boolean)));
        if (dates.length) {
          try {
            const { data: prompts } = await supabase
              .from('daily_prompts')
              .select('prompt_date, prompt_text')
              .in('prompt_date', dates)
              .eq('is_active', true);
            const map: Record<string, string> = {};
            (prompts || []).forEach((p: any) => { map[p.prompt_date] = p.prompt_text || ''; });
            setPromptByDate(map);
          } catch {}
        }
        // Fetch which of these dates the viewer has posted on, to control locks
        if (user?.id && dates.length) {
          try {
            const { data: vt } = await supabase
              .from('takes')
              .select('prompt_date')
              .eq('user_id', user.id)
              .in('prompt_date', dates);
            setViewerPostedDates(new Set((vt || []).map((r:any)=> r.prompt_date)));
          } catch {}
        }
        if (promptIds.length) {
          try {
            const { data: promptsById } = await supabase
              .from('daily_prompts')
              .select('id, prompt_text')
              .in('id', promptIds);
            const mapId: Record<string, string> = {};
            (promptsById || []).forEach((p: any) => { mapId[p.id] = p.prompt_text || ''; });
            setPromptById(mapId);
          } catch {}
        }
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
      // Counts + following status via RPC to avoid schema drift
      const viewerId = user?.id || null;
      const cachedStats = await fetchFollowStatsCached(viewerId, targetUserId);
      setFollowerCount(cachedStats.followers_count || 0);
      setFollowingCount(cachedStats.following_count || 0);
      setIsFollowing(!!cachedStats.is_following);

      // Samples for compact UI
      const { data: follRows } = await supabase
        .from('follows')
        .select('*')
        .limit(50);
      const followerIds = (follRows || [])
        .filter((r:any)=> ((r.followee_id || r.followed_id) === targetUserId))
        .map((r:any)=> r.follower_id)
        .slice(0,6);
      const follIds = followerIds;
      const { data: follProfiles } = follIds.length
        ? await supabase.from('profiles').select('id, username, avatar_url').in('id', follIds)
        : { data: [] } as any;
      setFollowersSample(follProfiles || []);

      const { data: ingRows } = await supabase
        .from('follows')
        .select('*')
        .limit(50);
      const ingIds = (igRows => (igRows||[])
        .filter((r:any)=> r.follower_id === targetUserId)
        .map((r:any)=> r.followee_id || r.followed_id)
        .slice(0,6))(ingRows as any);
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
        .select('*');
      const ids = (data || [])
        .filter((r:any)=> (r.followee_id || r.followed_id) === targetUserId)
        .map((r:any)=> r.follower_id);
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
        .select('*');
      const ids = (data || [])
        .filter((r:any)=> r.follower_id === targetUserId)
        .map((r:any)=> r.followee_id || r.followed_id);
      if (!ids.length) { setFollowing([]); return; }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', ids);
      setFollowing(profiles || []);
    } catch {}
  };

  const toggleFollow = async () => {
    if (!user?.id || !targetUserId || user.id === targetUserId || followActionBusy) return;
    setFollowActionBusy(true);
    try {
      if (isFollowing) {
        if (!window.confirm('Unfollow this user?')) { setFollowActionBusy(false); return; }
        const { error } = await supabase.rpc('unfollow_user', { p_viewer: user.id, p_target: targetUserId });
        if (error) toast({ title: 'Failed to unfollow', description: error.message, variant: 'destructive' });
        setIsFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
      } else {
        const { error } = await supabase.rpc('follow_user', { p_viewer: user.id, p_target: targetUserId });
        if (error) toast({ title: 'Failed to follow', description: error.message, variant: 'destructive' });
        setIsFollowing(true);
        setFollowerCount(c => c + 1);
      }
      // Fire-and-forget refresh to avoid UI stall
      try { loadFollowStats(); } catch {}
      try { if (followersOpen) openFollowers(); } catch {}
      try { if (followingOpen) openFollowing(); } catch {}
    } catch {}
    finally {
      setFollowActionBusy(false);
    }
  };

  const toggleFollowForId = async (otherId: string, currentlyFollowing: boolean) => {
    if (!user?.id || !otherId || user.id === otherId) return;
    try {
      setFollowBusy(prev => ({ ...prev, [otherId]: true }));
      if (currentlyFollowing) {
        const { error } = await supabase.rpc('unfollow_user', { p_viewer: user.id, p_target: otherId });
        if (error) toast({ title: 'Unfollow failed', description: error.message, variant: 'destructive' });
      } else {
        const { error } = await supabase.rpc('follow_user', { p_viewer: user.id, p_target: otherId });
        if (error) toast({ title: 'Follow failed', description: error.message, variant: 'destructive' });
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
    <div className="flex-1 flex flex-col h-full p-3 space-y-5">
      {/* Profile Card */}
      <Card className="bg-card-gradient">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start gap-4">
            <Avatar className="w-16 h-16">
              {profileUser?.avatar_url ? (
                <AvatarImage src={profileUser.avatar_url} alt={profileUser?.username || 'User'} />
              ) : null}
              <AvatarFallback className="bg-brand-primary text-brand-text text-2xl">
                {(profileUser?.username || 'U')[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-xl sm:text-2xl text-brand-text truncate">
                  {profileUser?.username || 'Unknown User'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    className="text-xs text-brand-muted hover:text-brand-accent underline"
                    onClick={async () => {
                      const url = `${window.location.origin}/${profileUser?.username || targetUserId}`;
                      try { logClientEvent('share_profile', { username: profileUser?.username || null, targetUserId, url }); } catch {}
                      try {
                        if ((navigator as any).share) {
                          await (navigator as any).share({ title: 'TopTake', text: 'Check out this profile', url });
                        } else {
                          await navigator.clipboard.writeText(url);
                          toast({ title: 'Link copied' });
                        }
                      } catch {}
                    }}
                  >
                    Share
                  </button>
                  {user?.id !== targetUserId && (
                    <>
                      <button className="text-xs p-1 border rounded px-2" onClick={toggleFollow}>
                        {isFollowing ? 'Unfollow' : 'Follow'}
                      </button>
                      <button
                        className="text-xs text-brand-danger hover:text-brand-text p-1 border rounded px-2"
                        onClick={async () => {
                          if (!window.confirm('Block this user? They will not be able to follow or view your profile.')) return;
                          try {
                            const { error } = await supabase.from('blocks').insert({ blocker_id: user?.id, blocked_id: targetUserId });
                            if (error && String((error as any).code) === '23505') {
                              // Already blocked
                            }
                          } catch {}
                        }}
                      >
                        Block
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isPrivateProfile && (
                <div className="text-xs text-brand-muted mt-0.5">Private profile</div>
              )}

              {/* Stats Row */}
              <div className="mt-1.5 flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-brand-text">{totalTakes || 0}</div>
                  <div className="text-xs text-brand-muted">takes</div>
                </div>
                <div className="text-center cursor-pointer" onClick={openFollowers}>
                  <div className="font-semibold text-brand-text">{followerCount || 0}</div>
                  <div className="text-xs text-brand-muted">followers</div>
                </div>
                <div className="text-center cursor-pointer" onClick={openFollowing}>
                  <div className="font-semibold text-brand-text">{followingCount || 0}</div>
                  <div className="text-xs text-brand-muted">following</div>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <Badge variant="outline" className="text-brand-primary border-brand-primary flex items-center gap-1">
                    <Flame className="w-4 h-4 text-brand-primary" />
                    {streak || 0} day streak
                  </Badge>
                  <Badge variant="outline" className="text-brand-accent border-brand-accent hidden sm:flex items-center gap-1">
                    <FileText className="w-4 h-4 text-brand-accent" />
                    {totalTakes || 0} takes
                  </Badge>
                </div>
              </div>

              {/* Bio row */}
              {profileUser?.bio ? (
                <p className="mt-2 text-sm text-brand-text/90 whitespace-pre-wrap break-words max-w-2xl leading-snug">
                  {profileUser.bio}
                </p>
              ) : (
                viewingOwnProfile ? (
                  <button
                    className="mt-2 text-xs text-brand-muted hover:text-brand-accent underline"
                    onClick={() => setShowEditProfile(true)}
                  >
                    Add a bio
                  </button>
                ) : null
              )}

              {/* Followers Modal */}
              <Dialog open={followersOpen} onOpenChange={setFollowersOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Followers</DialogTitle>
                    <DialogDescription>People who follow this profile</DialogDescription>
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
                              View Profile
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
                    <DialogDescription>Profiles this user is following</DialogDescription>
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
                                // Navigate to their profile
                                const { data } = await supabase.from('profiles').select('username').eq('id', p.id).maybeSingle();
                                const uname = data?.username || '';
                                if (uname) window.location.href = '/' + encodeURIComponent(uname);
                              }}
                            >
                              View Profile
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              {viewingOwnProfile && (
                <div className="mt-4 w-full max-w-2xl mx-auto">
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <Button size="sm" variant="outline" onClick={() => { setTheme('light' as any); setCurrentTheme('light'); }}>Light</Button>
                    <Button size="sm" variant="outline" onClick={() => { setTheme('dark' as any); setCurrentTheme('dark'); }}>Dark</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowStore(true)}>Trippy</Button>
                  </div>
                  <p className="text-xs text-brand-muted mt-1">Trippy includes premium themes.</p>
                </div>
              )}
              {viewingOwnProfile && (
                <>
                  <Button
                    onClick={() => setShowEditProfile(true)}
                    variant="outline"
                    size="sm"
                    className="mt-3 border-brand-border text-brand-muted hover:bg-brand-surface/80"
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

      {/* No date-specific UI on profile */}

      {/* User's Takes */}
      <div className="flex-1 min-h-0">
        <h3 className="text-sm uppercase tracking-wide text-brand-muted mb-2">{viewingOwnProfile ? 'Your takes' : 'Takes'}</h3>
        {userTakes.length > 0 ? (
          <div className="space-y-3">
            {userTakes.map((take) => (
              <div key={take.id} className="space-y-2">
                {take.prompt_date && (
                  <div className="rounded-lg p-2" style={{ background: surfaces.calloutBg, border: `1px solid ${surfaces.calloutBorder}` }}>
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 mt-0.5 text-brand-accent" />
                      <div className="flex-1 min-w-0">
                        <div className="text-brand-text/90 text-sm leading-snug">
                          {promptById[(take as any).prompt_id] || promptByDate[take.prompt_date] || '—'}
                        </div>
                        <div className="mt-0.5 text-[11px] text-brand-muted">
                          {(() => {
                            try {
                              const s = String(take.prompt_date || '').slice(0, 10);
                              const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                              if (m) {
                                const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
                                return `For ${format(d, 'MMM d, yyyy')}`;
                              }
                              return '';
                            } catch { return ''; }
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Lock/blur if viewer has not posted on this specific date (never lock on own profile) */}
                <div className={(!viewingOwnProfile && !viewerPostedDates.has(String((take as any).prompt_date || '').slice(0,10))) ? 'relative select-none' : ''}
                     onClick={async ()=>{
                       try {
                         const key = String((take as any).prompt_date || '').slice(0,10);
                         if (!viewingOwnProfile && !viewerPostedDates.has(key)) {
                           // Preselect the date and open late submit modal in the main app via URL param
                           const url = `/?late=${encodeURIComponent(key)}`;
                           window.location.href = url;
                         }
                       } catch {}
                     }}>
                  <div className={(!viewingOwnProfile && !viewerPostedDates.has(String((take as any).prompt_date || '').slice(0,10))) ? 'pointer-events-none blur-sm' : ''}>
                    {String((take as any).content || '').startsWith('[[PAID_SKIP]]') ? (
                      <div className="rounded border p-3 text-sm" style={{ background: surfaces.surface, borderColor: surfaces.border }}>
                        <div className="text-brand-text/90 font-medium">Paid skip</div>
                        <div className="text-brand-muted text-xs">No post for this day</div>
                      </div>
                    ) : (take.isAnonymous && !viewingOwnProfile) ? (
                      <div className="rounded border p-3 text-sm" style={{ background: surfaces.surface, borderColor: surfaces.border }}>
                        <div className="text-brand-text/90 font-medium">Anonymous take</div>
                        <div className="text-brand-muted text-xs">Hidden by author</div>
                      </div>
                    ) : (
                      <TakeCard 
                        take={take} 
                        onReact={handleReaction}
                      />
                    )}
                  </div>
                  {!viewingOwnProfile && !viewerPostedDates.has(String((take as any).prompt_date || '').slice(0,10)) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="px-3 py-1.5 rounded-full text-xs font-semibold border" style={{ background: surfaces.calloutBg, borderColor: surfaces.calloutBorder }}>🔒 Submit a late take for this date to unlock</div>
                    </div>
                  )}
                </div>
              </div>
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
        profile={profileUser || (user as any)}
        onUpdate={(updated) => {
          // Reflect updates immediately in the header (e.g., avatar_url)
          setProfileUser(prev => ({ ...(prev || {}), ...updated }));
        }}
      />
      {showStore && (
        <ThemeStoreModal isOpen={showStore} onClose={() => setShowStore(false)} />
      )}
    </div>
  );
};

export default ProfileView;