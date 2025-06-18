import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { createBrowserClient } from '@supabase/ssr';
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
  error: null
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
  const supabaseClient = createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

  const isAuthenticated = user !== null;

  const logout = async () => {
    try {
      await supabaseClient.auth.signOut();
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
      const { data: existingTake, error } = await supabaseClient
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
        await supabaseClient
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

        await supabaseClient
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
        await supabaseClient
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
      
      const { data: promptData, error: promptError } = await supabaseClient
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

  // Add this new function to handle auth state recovery
  const recoverAuthState = async () => {
    try {
      // First check if user exists in profiles
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      console.log('Auth Recovery Debug:', {
        userId: user?.id,
        profileExists: !!profile,
        profileError
      });

      if (profileError || !profile) {
        console.error('Profile not found, forcing re-auth');
        // Clear all auth state
        await supabaseClient.auth.signOut();
        // Clear local storage
        localStorage.clear();
        // Redirect to login
        window.location.href = '/login';
        return false;
      }

      // If profile exists but session is invalid, try to refresh
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
      if (sessionError || !session) {
        console.log('No valid session, attempting to refresh...');
        const { data: { session: refreshedSession }, error: refreshError } = await supabaseClient.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('Session refresh failed, forcing re-auth');
          await supabaseClient.auth.signOut();
          localStorage.clear();
          window.location.href = '/login';
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error in auth recovery:', error);
      return false;
    }
  };

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
        return false;
      }

      console.log('submitTake: User found, proceeding with submission');

      // Verify session before submission with retry logic
      console.log('submitTake: About to call getSession...');
      let session = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const { data: { session: currentSession }, error: sessionError } = await supabaseClient.auth.getSession();
          console.log(`submitTake: getSession attempt ${retryCount + 1}:`, {
            hasSession: !!currentSession,
            sessionError,
            userId: user.id
          });

          if (currentSession) {
            session = currentSession;
            break;
          }

          if (sessionError) {
            console.error('Session error:', sessionError);
          }

          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`Retrying session check (${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
          }
        } catch (error) {
          console.error(`Session check attempt ${retryCount + 1} failed:`, error);
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!session) {
        console.error('Failed to get valid session after retries');
        return false;
      }

      console.log('submitTake: Session verified, preparing data');

      const today = new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate()
      )).toISOString().split('T')[0];

      // Debug insert data
      const insertData = {
        user_id: user.id,
        content,
        is_anonymous: isAnonymous,
        prompt_date: today,
        created_at: new Date().toISOString(),
        is_late_submit: false,
        is_deleted: false
      };
      console.log('Insert Data:', insertData);

      // First check if user already has a take for today
      console.log('Checking for existing take...');
      const { data: existingTake, error: checkError } = await supabaseClient
        .from('takes')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_date', today)
        .maybeSingle();

      console.log('Existing take check:', {
        existingTake,
        checkError,
        userId: user.id,
        today
      });

      if (existingTake) {
        console.error('User already has a take for today');
        return false;
      }

      // Attempt the insert with detailed logging
      console.log('Attempting to insert take...');
      const { data: insertedTake, error: insertError } = await supabaseClient
        .from('takes')
        .insert(insertData)
        .select()
        .single();

      console.log('Insert Result:', {
        insertedTake,
        insertError: insertError ? {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          statusCode: insertError.statusCode
        } : null,
        success: !!insertedTake
      });

      if (insertError) {
        console.error('Full insert error:', JSON.stringify(insertError, null, 2));
        return false;
      }

      if (!insertedTake) {
        console.error('No take was inserted despite no error');
        return false;
      }

      // Verify the take was actually created
      console.log('Verifying take creation...');
      const { data: verifiedTake, error: verifyError } = await supabaseClient
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
        return false;
      }

      // Only proceed with updates if we confirmed the take was created
      console.log('Take successfully created, updating user state...');
      
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ 
          current_streak: user.current_streak + 1,
          last_post_date: today
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
        return false;
      }

      // Update local state only after successful database operations
      setHasPostedToday(true);
      setUser(prev => prev ? { 
        ...prev, 
        current_streak: user.current_streak + 1,
        last_post_date: today
      } : null);
      setIsAppBlocked(false);
      await updateStreak();
      await fetchTomorrowPrompt();

      console.log('Take submission completed successfully');
      return true;

    } catch (error) {
      console.error('submitTake crashed:', error);
      return false;
    }
  };

  const handleAuthenticatedUser = async (authUser: any) => {
    try {
      const { data: profile, error: profileError } = await supabaseClient
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
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        setUserCredits(defaultCredits);
        return;
      }

      const { data, error: creditsError } = await supabaseClient
        .rpc('get_user_credits', { user_id: user.id });

      if (creditsError) throw creditsError;

      setUserCredits(data || defaultCredits);
    } catch (err) {
      console.error('Error fetching credits:', err);
      setError(err.message || 'Failed to fetch credits');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
        console.log('Initial session state:', {
          hasSession: !!session,
          sessionError,
          userId: session?.user?.id
        });

        if (sessionError) {
          console.error('Error getting initial session:', sessionError);
          return;
        }

        if (session) {
          // Set the session in the client
          const { error: setSessionError } = await supabaseClient.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token
          });

          if (setSessionError) {
            console.error('Error setting session:', setSessionError);
            return;
          }

          // Verify session was set
          const { data: { session: verifySession } } = await supabaseClient.auth.getSession();
          console.log('Session verification:', {
            hasSession: !!verifySession,
            userId: verifySession?.user?.id,
            accessToken: verifySession?.access_token ? 'present' : 'missing'
          });

          // Get user profile
          const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
            return;
          }

          if (profile) {
            setUser(profile);
            setHasPostedToday(profile.has_posted_today);
          }
        }

        // Set up auth state change listener
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', {
            event,
            hasSession: !!session,
            userId: session?.user?.id
          });

          if (session) {
            // Set the session in the client
            const { error: setSessionError } = await supabaseClient.auth.setSession({
              access_token: session.access_token,
              refresh_token: session.refresh_token
            });

            if (setSessionError) {
              console.error('Error setting session on auth change:', setSessionError);
              return;
            }

            // Get user profile
            const { data: profile, error: profileError } = await supabaseClient
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            if (profileError) {
              console.error('Error fetching profile on auth change:', profileError);
              return;
            }

            if (profile) {
              setUser(profile);
              setHasPostedToday(profile.has_posted_today);
            }
          } else {
            setUser(null);
            setHasPostedToday(false);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error in initializeAuth:', error);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    // Subscribe to real-time updates for the current user's profile
    const profileSub = supabaseClient
      .channel('public:profiles')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        async (payload) => {
          // Refetch the updated profile
          const { data: profile } = await supabaseClient
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
      supabaseClient.removeChannel(profileSub);
    };
  }, [user?.id]);

  useEffect(() => {
    refreshUserCredits();
  }, []);

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
        userCredits,
        setUserCredits,
        refreshUserCredits,
        isLoading,
        error
      }}
    >
      {children}
    </AppContext.Provider>
  );
};