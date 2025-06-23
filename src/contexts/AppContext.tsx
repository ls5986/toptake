import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { User } from '@/types';
import { getUserCredits, CreditType } from '@/lib/credits';

interface UserCredits {
  anonymous: number;
  late_submit: number;
  sneak_peek: number;
  boost: number;
  extra_takes: number;
  delete: number;
}

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
  setHasPostedToday: (value: boolean) => void;
  checkHasPostedToday: () => Promise<void>;
  currentPrompt: string;
  tomorrowPrompt: string | null;
  submitTake: (content: string, isAnonymous: boolean, promptId?: string) => Promise<boolean>;
  isAppBlocked: boolean;
  setIsAppBlocked: (blocked: boolean) => void;
  currentTakeId: string | null;
  setCurrentTakeId: (id: string | null) => void;
  userCredits: UserCredits;
  setUserCredits: (credits: UserCredits) => void;
  refreshUserCredits: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearUserState: () => void;
}

const defaultCredits: UserCredits = {
  anonymous: 0,
  late_submit: 0,
  sneak_peek: 0,
  boost: 0,
  extra_takes: 0,
  delete: 0
};

const AppContext = createContext<AppContextType>({
  user: null,
  setUser: () => {},
  currentScreen: 'main',
  setCurrentScreen: () => {},
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  setHasCompletedOnboarding: () => {},
  checkDailyPost: async () => {},
  updateStreak: async () => {},
  shouldShowCarousel: false,
  setShouldShowCarousel: () => {},
  logout: async () => {},
  selectedProfile: null,
  setSelectedProfile: () => {},
  hasPostedToday: false,
  setHasPostedToday: () => {},
  checkHasPostedToday: async () => {},
  currentPrompt: '',
  tomorrowPrompt: null,
  submitTake: async () => false,
  isAppBlocked: false,
  setIsAppBlocked: () => {},
  currentTakeId: null,
  setCurrentTakeId: () => {},
  userCredits: defaultCredits,
  setUserCredits: () => {},
  refreshUserCredits: async () => {},
  isLoading: true,
  error: null,
  clearUserState: () => {}
});

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
  const [userCredits, setUserCredits] = useState<UserCredits>(defaultCredits);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

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
    if (!user) {
      console.log('checkDailyPost: No user found');
      return false;
    }

    try {
      // Get user's timezone offset in minutes
      const userTimezoneOffset = user.timezone_offset || 0;
      
      // Calculate today's date in user's timezone
      const now = new Date();
      const userDate = new Date(now.getTime() + (userTimezoneOffset * 60000));
      const today = userDate.toISOString().split('T')[0];

      console.log('checkDailyPost:', {
        userId: user.id,
        userTimezoneOffset,
        today,
        lastPostDate: user.last_post_date
      });

      // Check if user has posted today
      const { data: existingTake, error } = await supabase
        .from('takes')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_date', today)
        .single();

      console.log('checkDailyPost result:', {
        existingTake,
        error,
        hasPosted: !!existingTake
      });

      return !!existingTake;
    } catch (error) {
      console.error('Error checking daily post:', error);
      return false;
    }
  };

  const updateStreak = async () => {
    if (!user) return;

    try {
      // Get user's timezone offset in minutes
      const userTimezoneOffset = user.timezone_offset || 0;
      
      // Calculate today's date in user's timezone
      const now = new Date();
      const userDate = new Date(now.getTime() + (userTimezoneOffset * 60000));
      const today = userDate.toISOString().split('T')[0];

      const lastPostDate = user.last_post_date;

      if (!lastPostDate) {
        // First post ever
        await supabase
          .from('profiles')
          .update({ 
            current_streak: 1,
            longest_streak: 1,
            last_post_date: today
          })
          .eq('id', user.id);

        setUser({ 
          ...user, 
          current_streak: 1,
          longest_streak: 1,
          last_post_date: today
        });
        return;
      }

      // Calculate days between last post and today in user's timezone
      const lastPost = new Date(lastPostDate);
      const lastPostInUserTz = new Date(lastPost.getTime() + (userTimezoneOffset * 60000));
      const diffTime = Math.abs(userDate.getTime() - lastPostInUserTz.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        const newStreak = (user.current_streak || 0) + 1;
        const newLongestStreak = Math.max(newStreak, user.longest_streak || 0);

        await supabase
          .from('profiles')
          .update({ 
            current_streak: newStreak,
            longest_streak: newLongestStreak,
            last_post_date: today
          })
          .eq('id', user.id);

        setUser({ 
          ...user, 
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          last_post_date: today
        });
      } else if (diffDays > 1) {
        // Streak broken
        await supabase
          .from('profiles')
          .update({ 
            current_streak: 1,
            last_post_date: today
          })
          .eq('id', user.id);

        setUser({ 
          ...user, 
          current_streak: 1,
          last_post_date: today
        });
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
      
      const { data: promptData, error: promptError } = await supabase
        .from('daily_prompts')
        .select('prompt_text')
        .eq('prompt_date', tomorrowStr)
        .single();
      
      if (promptData) {
        setTomorrowPrompt(promptData.prompt_text);
      } else {
        setTomorrowPrompt('Tomorrow\'s prompt will be revealed soon!');
      }
    } catch (error) {
      console.error('Error fetching tomorrow prompt:', error);
      setTomorrowPrompt('Tomorrow\'s prompt will be revealed soon!');
    }
  };

  // Utility to force logout and redirect to login
  const forceLogoutAndRedirect = async (reason?: string) => {
    try {
      console.warn('Force logout and redirect triggered', reason || '');
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setCurrentScreen('main');
      setHasCompletedOnboarding(false);
      setShouldShowCarousel(false);
      setSelectedProfile(null);
      setIsAppBlocked(false);
      setHasPostedToday(false);
      setCurrentTakeId(null);
      setUserCredits(defaultCredits);
      setError(null);
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during forceLogoutAndRedirect:', error);
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setCurrentScreen('main');
      setIsAppBlocked(false);
      setHasPostedToday(false);
      setCurrentTakeId(null);
      setUserCredits(defaultCredits);
      setError(null);
      window.location.href = '/login';
    }
  };

  // Utility to clear user state when session validation fails
  const clearUserState = () => {
    console.log('Clearing user state due to invalid session');
    setUser(null);
    setCurrentScreen('main');
    setHasCompletedOnboarding(false);
    setShouldShowCarousel(false);
    setSelectedProfile(null);
    setIsAppBlocked(false);
    setHasPostedToday(false);
    setCurrentTakeId(null);
    setUserCredits(defaultCredits);
    setError(null);
  };

  // Refactored initializeAuth with timeout and robust error handling
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Timeout helper
        const withTimeout = (promise, ms, label) => {
          return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(label + ' timeout')), ms))
          ]);
        };
        // Get initial session with timeout
        let session;
        try {
          const sessionResult = await withTimeout(supabase.auth.getSession(), 7000, 'getSession');
          session = sessionResult?.data?.session;
          if (!session) throw new Error('No session returned');
        } catch (err) {
          console.error('initializeAuth: Failed to get session or timed out', err);
          await forceLogoutAndRedirect('No valid session on app load');
          return;
        }
        // Get user profile with timeout
        let profile;
        try {
          const profileResult = await withTimeout(
            supabase.from('profiles').select('*').eq('id', session.user.id).single(),
            7000,
            'profile fetch'
          );
          profile = profileResult?.data;
          if (!profile) throw new Error('No profile returned');
        } catch (err) {
          console.error('initializeAuth: Failed to get profile or timed out', err);
          await forceLogoutAndRedirect('No valid profile on app load');
          return;
        }
        setUser(profile);
        setHasPostedToday(profile.has_posted_today);
        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', { event, hasSession: !!session, userId: session?.user?.id });
          if (session) {
            setUser(session.user);
            // Optionally re-fetch profile here
          } else {
            await forceLogoutAndRedirect('Auth state change: session null');
          }
        });
        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        await forceLogoutAndRedirect('initializeAuth error');
      }
    };
    initializeAuth();
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

  useEffect(() => {
    refreshUserCredits();
  }, []);

  // Refactored recoverAuthState with timeout and robust error handling
  const recoverAuthState = async () => {
    try {
      const withTimeout = (promise, ms, label) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error(label + ' timeout')), ms))
        ]);
      };
      // Check profile
      let profile;
      try {
        const profileResult = await withTimeout(
          supabase.from('profiles').select('*').eq('id', user?.id).single(),
          7000,
          'profile fetch'
        );
        profile = profileResult?.data;
        if (!profile) throw new Error('No profile returned');
      } catch (err) {
        console.error('recoverAuthState: Failed to get profile or timed out', err);
        await forceLogoutAndRedirect('recoverAuthState: no profile');
        return false;
      }
      // Check session
      let session;
      try {
        const sessionResult = await withTimeout(supabase.auth.getSession(), 7000, 'getSession');
        session = sessionResult?.data?.session;
        if (!session) throw new Error('No session returned');
      } catch (err) {
        console.error('recoverAuthState: Failed to get session or timed out', err);
        await forceLogoutAndRedirect('recoverAuthState: no session');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error in recoverAuthState:', error);
      await forceLogoutAndRedirect('recoverAuthState: error');
      return false;
    }
  };

  // Refactored submitTake to force logout on session error
  const submitTake = async (content: string, isAnonymous: boolean, promptId?: string): Promise<boolean> => {
    console.log('submitTake function called - ENTRY POINT', {
      contentLength: content?.length,
      isAnonymous,
      promptId,
      hasUser: !!user,
      userId: user?.id
    });
    try {
      if (!user) {
        console.error('submitTake: No user found');
        await forceLogoutAndRedirect('submitTake: no user');
        return false;
      }
      // Get today's prompt ID from the prompts table
      const today = new Date().toLocaleDateString('en-CA');
      const { data: promptData, error: promptError } = await supabase
        .from('daily_prompts')
        .select('id')
        .eq('prompt_date', today)
        .single();
      if (promptError || !promptData) {
        console.error('Error fetching today\'s prompt:', promptError);
        alert('No prompt found for today. Please try again later.');
        return false;
      }
      const actualPromptId = promptId || promptData.id;
      // Verify session before submission with timeout
      let session;
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('getSession timeout')), 7000))
        ]);
        session = sessionResult?.data?.session;
        if (!session) throw new Error('No session returned');
      } catch (err) {
        console.error('submitTake: Failed to get session or timed out', err);
        await forceLogoutAndRedirect('submitTake: no session');
        return false;
      }

      console.log('submitTake: Session verified, preparing data');

      // Debug insert data
      const insertData = {
        user_id: user.id,
        content,
        is_anonymous: isAnonymous,
        prompt_id: actualPromptId,
        prompt_date: today,
        is_late_submit: false,
        is_deleted: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      console.log('Insert Data:', insertData);

      // First check if user already has a take for today
      console.log('Checking for existing take...');
      const { data: existingTake, error: checkError } = await supabase
        .from('takes')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_id', actualPromptId)
        .maybeSingle();

      console.log('Existing take check:', {
        existingTake,
        checkError,
        userId: user.id,
        today
      });

      if (existingTake) {
        console.error('User already has a take for today');
        alert('You have already submitted a take for today.');
        return false;
      }

      // Attempt the insert with detailed logging
      console.log('Attempting to insert take...');
      const { data: insertedTake, error: insertError } = await supabase
        .from('takes')
        .insert(insertData)
        .select()
        .single();

      console.log('Insert Result:', {
        insertedTake,
        insertError,
        insertData
      });

      if (insertError) {
        console.error('Full insert error:', insertError, JSON.stringify(insertError, null, 2));
        alert('Failed to submit take: ' + (insertError.message || 'Unknown error'));
        return false;
      }

      if (!insertedTake) {
        console.error('No take was inserted despite no error');
        alert('No take was inserted. Please try again.');
        return false;
      }

      // Verify the take was actually created
      console.log('Verifying take creation...');
      const { data: verifiedTake, error: verifyError } = await supabase
        .from('takes')
        .select('*')
        .eq('id', insertedTake.id)
        .single();

      console.log('Verification Result:', {
        verifiedTake,
        verifyError,
        exists: !!verifiedTake
      });

      if (verifyError || !verifiedTake) {
        console.error('Take was not properly created:', {
          error: verifyError,
          data: verifiedTake
        });
        alert('Take was not properly created. Please try again.');
        return false;
      }

      // Only proceed with updates if we confirmed the take was created
      console.log('Take successfully created, updating user state...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          current_streak: user.current_streak + 1,
          last_post_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
        alert('Failed to update profile after take submission.');
        return false;
      }

      // Update local state only after successful database operations
      setHasPostedToday(true);
      setUser(prev => prev ? { 
        ...prev, 
        current_streak: user.current_streak + 1,
        last_post_date: new Date().toISOString().split('T')[0]
      } : null);
      setIsAppBlocked(false);
      await updateStreak();
      await fetchTomorrowPrompt();

      console.log('Take submission completed successfully');
      return true;

    } catch (error) {
      console.error('submitTake crashed:', error);
      alert('An unexpected error occurred: ' + (error?.message || error));
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
          current_streak: profile.current_streak || 0,
          timezone_offset: profile.timezone_offset || 0,
          isPremium: profile.is_premium || false,
          is_admin: profile.is_admin || false,
          last_post_date: profile.last_post_date || undefined,
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

        // Load all user credits
        const creditTypes: CreditType[] = ['anonymous', 'late_submit', 'sneak_peek', 'boost', 'extra_takes', 'delete'];
        const credits: Record<CreditType, number> = { anonymous: 0, late_submit: 0, sneak_peek: 0, boost: 0, extra_takes: 0, delete: 0 };
        await Promise.all(creditTypes.map(async (type) => {
          credits[type] = await getUserCredits(profile.id, type);
        }));
        setUserCredits(credits as UserCredits);
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

  const refreshUserCredits = async () => {
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUserCredits(defaultCredits);
        return;
      }
      const { data, error: creditsError } = await supabase
        .from('user_credits')
        .select('credit_type, balance')
        .eq('user_id', user.id);
      if (creditsError) {
        throw creditsError;
      }

      setUserCredits(data || defaultCredits);
    } catch (err) {
      console.error('Error fetching credits:', err);
      setError(err.message || 'Failed to fetch credits');
    } finally {
      setIsLoading(false);
    }
  };

  // Utility to check if the user has posted today by querying the backend
  const checkHasPostedToday = async () => {
    if (!user) {
      setHasPostedToday(false);
      return;
    }
    try {
      const today = new Date().toLocaleDateString('en-CA');
      const { data: takes, error } = await supabase
        .from('takes')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_date', today);
      if (error) {
        console.error('Error checking hasPostedToday:', error);
        setHasPostedToday(false);
        return;
      }
      setHasPostedToday(!!(takes && takes.length > 0));
    } catch (err) {
      console.error('Error in checkHasPostedToday:', err);
      setHasPostedToday(false);
    }
  };

  // Call checkHasPostedToday on mount and whenever user changes
  useEffect(() => {
    checkHasPostedToday();
  }, [user]);

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
        setHasPostedToday,
        checkHasPostedToday,
        currentPrompt,
        tomorrowPrompt,
        submitTake,
        isAppBlocked,
        setIsAppBlocked,
        currentTakeId,
        setCurrentTakeId,
        userCredits,
        setUserCredits,
        refreshUserCredits,
        isLoading,
        error,
        clearUserState
      }}
    >
      {children}
    </AppContext.Provider>
  );
};