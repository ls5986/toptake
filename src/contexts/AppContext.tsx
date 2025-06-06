import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { User } from '@/types';

interface AppContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (value: boolean) => void;
  checkDailyPost: () => Promise<void>;
  updateStreak: () => Promise<void>;
  shouldShowCarousel: boolean;
  setShouldShowCarousel: (value: boolean) => void;
  logout: () => void;
  selectedProfile: string | null;
  setSelectedProfile: (profileId: string | null) => void;
  hasPostedToday: boolean;
  currentPrompt: string;
  tomorrowPrompt: string | null;
  submitTake: (content: string, isAnonymous: boolean, promptId?: string) => Promise<boolean>;
  isAppBlocked: boolean;
  setIsAppBlocked: (blocked: boolean) => void;
  currentTakeId: string | null;
  setCurrentTakeId: (id: string | null) => void;
}

const AppContext = createContext<AppContextType>({} as AppContextType);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState('main');
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [shouldShowCarousel, setShouldShowCarousel] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasPostedToday, setHasPostedToday] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [tomorrowPrompt, setTomorrowPrompt] = useState<string | null>(null);
  const [isAppBlocked, setIsAppBlocked] = useState(false);
  const [currentTakeId, setCurrentTakeId] = useState<string | null>(null);

  const isAuthenticated = user !== null;

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      setUser(null);
      setCurrentScreen('main');
      setHasCompletedOnboarding(false);
      setShouldShowCarousel(false);
      setSelectedProfile(null);
      setIsAppBlocked(false);
    } catch (error) {
      console.error('Error logging out:', error);
      localStorage.clear();
      setUser(null);
      setCurrentScreen('main');
      setIsAppBlocked(false);
    }
  };

  const checkDailyPost = async () => {
    try {
      if (!user) {
        setIsAppBlocked(false);
        return;
      }
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data: takesData } = await supabase
        .from('takes')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_date', today)
        .limit(1);
      
      const hasPosted = !!(takesData && takesData.length > 0);
      
      setHasPostedToday(hasPosted);
      setUser(prev => prev ? { ...prev, hasPostedToday: hasPosted } : null);
      
      if (isAuthenticated && !hasPosted) {
        setIsAppBlocked(true);
      } else {
        setIsAppBlocked(false);
      }
      
      await supabase
        .from('profiles')
        .update({ has_posted_today: hasPosted })
        .eq('id', user.id);
        
    } catch (error) {
      console.error('Error checking daily post:', error);
      if (isAuthenticated && user) {
        setIsAppBlocked(true);
      }
    }
  };

  const updateStreak = async () => {
    try {
      if (!user) return;
      
      const newStreak = user.streak + 1;
      const { error } = await supabase
        .from('profiles')
        .update({ streak: newStreak })
        .eq('id', user.id);
      
      if (!error) {
        setUser({ ...user, streak: newStreak });
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const fetchTomorrowPrompt = async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('daily_prompts')
        .select('prompt')
        .eq('prompt_date', tomorrowStr)
        .single();
      
      if (data) {
        setTomorrowPrompt(data.prompt);
      } else {
        setTomorrowPrompt('Tomorrow\'s prompt will be revealed soon!');
      }
    } catch (error) {
      console.error('Error fetching tomorrow prompt:', error);
      setTomorrowPrompt('Tomorrow\'s prompt will be revealed soon!');
    }
  };

  const submitTake = async (content: string, isAnonymous: boolean, promptId?: string): Promise<boolean> => {
    try {
      if (!user) return false;
      // Use currentPrompt from context if available
      const prompt = typeof currentPrompt === 'object' ? currentPrompt : null;
      const today = prompt?.prompt_date || new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate()
      )).toISOString().split('T')[0];
      const prompt_id = prompt?.id || promptId;
      const { error } = await supabase
        .from('takes')
        .insert({
          user_id: user.id,
          content,
          is_anonymous: isAnonymous,
          prompt_date: today,
          prompt_id,
          created_at: new Date().toISOString(),
          reactions: { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 }
        });
      if (error) {
        console.error('Error submitting take:', error);
        return false;
      }
      // Insert engagement analytics record
      const { error: analyticsError } = await supabase
        .from('engagement_analytics')
        .insert({
          prompt_id,
          user_id: user.id,
          action_type: 'take',
          created_at: new Date().toISOString()
        });
      if (analyticsError) {
        console.error('Error inserting engagement analytics:', analyticsError);
      }
      await supabase
        .from('profiles')
        .update({ has_posted_today: true })
        .eq('id', user.id);
      setHasPostedToday(true);
      setUser(prev => prev ? { ...prev, hasPostedToday: true } : null);
      setIsAppBlocked(false);
      await updateStreak();
      await fetchTomorrowPrompt();
      return true;
    } catch (error) {
      console.error('Error submitting take:', error);
      return false;
    }
  };

  const handleAuthenticatedUser = async (authUser: any) => {
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Profile error:', profileError);
        setCurrentScreen('profileSetup');
        setIsAppBlocked(false);
        return;
      }
      
      if (profile && profile.username) {
        const userObj = {
          id: profile.id,
          username: profile.username,
          email: authUser.email || '',
          streak: profile.streak || 0,
          dramaScore: profile.drama_score || 0,
          anonymousCredits: profile.anonymous_credits || 3,
          hasPostedToday: profile.has_posted_today || false,
          timezone_offset: profile.timezone_offset || 0,
          isPremium: profile.is_premium || false,
          is_admin: profile.is_admin || false,
          lastPostDate: profile.last_post_date || undefined,
          anonymous_uses_remaining: profile.anonymous_uses_remaining,
          delete_uses_remaining: profile.delete_uses_remaining,
          boost_uses_remaining: profile.boost_uses_remaining,
          history_unlocked: profile.history_unlocked,
          extra_takes_remaining: profile.extra_takes_remaining,
        };
        
        setUser(userObj);
        setCurrentScreen('main');
        setHasCompletedOnboarding(true);
        fetchTomorrowPrompt();
        
        setTimeout(() => checkDailyPost(), 100);
      } else {
        setCurrentScreen('profileSetup');
        setIsAppBlocked(false);
      }
    } catch (error) {
      console.error('Error handling authenticated user:', error);
      setCurrentScreen('profileSetup');
      setIsAppBlocked(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const checkUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (sessionError || !session) {
          setCurrentScreen('main');
          setIsLoading(false);
          setIsAppBlocked(false);
          return;
        }
        
        const authUser = session.user;
        
        if (authUser && (authUser.email_confirmed_at || authUser.created_at)) {
          await handleAuthenticatedUser(authUser);
        } else {
          setCurrentScreen('main');
          setIsAppBlocked(false);
        }
      } catch (error) {
        console.error('Error checking user:', error);
        if (mounted) {
          setCurrentScreen('main');
          setIsAppBlocked(false);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setCurrentScreen('main');
        setHasCompletedOnboarding(false);
        setIsAppBlocked(false);
      } else if (event === 'SIGNED_IN' && session) {
        await handleAuthenticatedUser(session.user);
      }
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    // Subscribe to real-time updates for the current user's profile
    const profileSub = supabase
      .channel('public:profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        async (payload) => {
          // Refetch the updated profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          if (profile) {
            setUser((prev) => prev ? { ...prev, ...profile } : prev);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(profileSub);
    };
  }, [user?.id]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        currentScreen,
        setCurrentScreen,
        isAuthenticated,
        hasCompletedOnboarding,
        setHasCompletedOnboarding,
        checkDailyPost,
        updateStreak,
        shouldShowCarousel,
        setShouldShowCarousel,
        logout,
        selectedProfile,
        setSelectedProfile,
        hasPostedToday,
        currentPrompt,
        tomorrowPrompt,
        submitTake,
        isAppBlocked,
        setIsAppBlocked,
        currentTakeId,
        setCurrentTakeId,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};