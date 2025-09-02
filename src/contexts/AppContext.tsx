import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  isSubmittingTake: boolean;
  isCheckingPostStatus: boolean;
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
  clearUserState: () => {},
  isSubmittingTake: false,
  isCheckingPostStatus: false
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
  const [isSubmittingTake, setIsSubmittingTake] = useState(false);
  const [isCheckingPostStatus, setIsCheckingPostStatus] = useState(false);
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
    if (!user) return false;

    try {
      // Use simple local date - no timezone math
      const today = new Date().toISOString().split('T')[0];
      
      console.log('checkDailyPost:', {
        userId: user.id,
        today,
        lastPostDate: user.last_post_date
      });

      // Check if user has posted today
      const { data: existingTake, error } = await supabase
        .from('takes')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_date', today)
        .maybeSingle();

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
        
        setUser(prev => prev ? { ...prev, current_streak: 1, longest_streak: 1, last_post_date: today } : null);
        return;
      }

      // Check if this is a consecutive day
      const lastPost = new Date(lastPostDate);
      const todayDate = new Date(today);
      const diffTime = Math.abs(todayDate.getTime() - lastPost.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day
        const newStreak = user.current_streak + 1;
        const newLongestStreak = Math.max(newStreak, user.longest_streak || 0);
        
        await supabase
          .from('profiles')
          .update({ 
            current_streak: newStreak,
            longest_streak: newLongestStreak,
            last_post_date: today
          })
          .eq('id', user.id);
        
        setUser(prev => prev ? { 
          ...prev, 
          current_streak: newStreak, 
          longest_streak: newLongestStreak, 
          last_post_date: today 
        } : null);
      } else if (diffDays > 1) {
        // Streak broken, start new streak
        await supabase
          .from('profiles')
          .update({ 
            current_streak: 1,
            last_post_date: today
          })
          .eq('id', user.id);
        
        setUser(prev => prev ? { ...prev, current_streak: 1, last_post_date: today } : null);
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
      
      const { data: promptData, error } = await supabase
        .from('daily_prompts')
        .select('prompt_text')
        .eq('prompt_date', tomorrowStr)
        .eq('is_active', true)
        .single();
      
      if (error || !promptData) {
        setTomorrowPrompt(null);
        return;
      }
      
      setTomorrowPrompt(promptData.prompt_text);
    } catch (error) {
      console.error('Error fetching tomorrow prompt:', error);
      setTomorrowPrompt(null);
    }
  };

  const forceLogoutAndRedirect = async (reason?: string) => {
    console.error('Force logout:', reason);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during force logout:', error);
    }
    
    localStorage.clear();
    setUser(null);
    setCurrentScreen('main');
    setHasCompletedOnboarding(false);
    setShouldShowCarousel(false);
    setSelectedProfile(null);
    setIsAppBlocked(false);
    setHasPostedToday(false);
    setError(null);
  };

  const clearUserState = () => {
    setUser(null);
    setCurrentScreen('main');
    setHasCompletedOnboarding(false);
    setShouldShowCarousel(false);
    setSelectedProfile(null);
    setIsAppBlocked(false);
    setHasPostedToday(false);
    setError(null);
  };

  // ✅ ADD: Simple, reliable auth initialization
  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // Simple session check - let Supabase handle timeouts
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.log('No valid session');
        setUser(null);
        setHasPostedToday(false);
        setIsLoading(false);
        return;
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      if (profileError || !profile) {
        console.error('Failed to fetch profile:', profileError);
        await forceLogoutAndRedirect('Invalid profile');
        return;
      }

      // Set user first
      const userObj = {
        id: profile.id,
        username: profile.username,
        email: session.user.email || '',
        current_streak: profile.current_streak || 0,
        timezone_offset: profile.timezone_offset || 0,
        isPremium: profile.is_premium || false,
        is_admin: profile.is_admin || false,
        last_post_date: profile.last_post_date || undefined,
      };
      
      setUser(userObj);
      
      // CRITICAL: Always check backend for hasPostedToday
      // This is the single source of truth
      await checkHasPostedTodayFromBackend(profile.id);
      
      setIsLoading(false);
      
    } catch (error) {
      console.error('Auth failed:', error);
      setUser(null);
      setHasPostedToday(false);
      setIsLoading(false);
    }
  };

  // ✅ ADD: Single source of truth for posting status
  const checkHasPostedTodayFromBackend = useCallback(async (userId?: string) => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) {
      console.log('⚠️ No user ID provided for checkHasPostedTodayFromBackend');
      setHasPostedToday(false);
      return;
    }

    try {
      // Use local date for prompt_date
      const today = new Date();
      const todayStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');
      
      console.log('🔍 Checking for takes:', { userId: targetUserId, today: todayStr });
      
      // Use better query structure to avoid 406 errors
      const { data: takes, error } = await supabase
        .from('takes')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('prompt_date', todayStr)
        .limit(1);
        
      if (error) {
        console.error('❌ Error checking daily post:', error);
        setHasPostedToday(false);
        return;
      }
      
      const hasPosted = !!(takes && takes.length > 0);
      setHasPostedToday(hasPosted);
      
      console.log('✅ Backend check result:', {
        userId: targetUserId,
        today: todayStr,
        hasPosted,
        takesFound: takes?.length || 0
      });
      
    } catch (error) {
      console.error('❌ Error in checkHasPostedToday:', error);
      setHasPostedToday(false);
    }
  }, []);

  // ✅ ADD: Auth listener with cleanup
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event);
        
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setHasPostedToday(false);
        } else if (event === 'SIGNED_IN' && session) {
          // Re-initialize on sign in
          await initializeAuth();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []); // Empty dependency array for auth listener

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // ✅ ADD: Proper dependencies
  // useEffect(() => {
  //   checkHasPostedTodayFromBackend();
  // }, [checkHasPostedTodayFromBackend]);

  // ✅ ADD: Bulletproof Take Submission
  const submitTake = async (content: string, isAnonymous: boolean, promptId?: string): Promise<boolean> => {
    console.log('🚀 submitTake called:', { 
      contentLength: content?.length, 
      isAnonymous, 
      promptId,
      isAlreadySubmitting: isSubmittingTake 
    });
    
    // Prevent double submissions
    if (isSubmittingTake) {
      console.log('⚠️ Submission already in progress');
      return false;
    }
    
    if (!user?.id) {
      console.error('❌ No user found');
      return false;
    }

    if (!content?.trim()) {
      console.error('❌ No content provided');
      return false;
    }

    setIsSubmittingTake(true);
    
    try {
      const today = new Date().toISOString().split('T')[0]; // ✅ Use correct ISO format
      
      // Get today's prompt if not provided
      let actualPromptId = promptId;
      if (!actualPromptId) {
        const { data: promptData, error: promptError } = await supabase
          .from('daily_prompts')
          .select('id')
          .eq('prompt_date', today)
          .eq('is_active', true)
          .single();
          
        if (promptError || !promptData) {
          console.error('❌ No prompt found for today:', promptError);
          return false;
        }
        actualPromptId = promptData.id;
      }

      // Double-check if user already submitted (prevent duplicates)
      const { data: existingTake } = await supabase
        .from('takes')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_date', today)
        .maybeSingle();

      if (existingTake) {
        console.log('ℹ️ User already submitted today, updating state');
        setHasPostedToday(true);
        return true; // Still count as success
      }

      // ✅ Use Supabase client, not raw fetch
      const { data: insertedTake, error: insertError } = await supabase
        .from('takes')
        .insert({
          user_id: user.id,
          content: content.trim(),
          is_anonymous: isAnonymous,
          prompt_id: actualPromptId,
          prompt_date: today,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Failed to insert take:', insertError);
        return false;
      }

      if (!insertedTake) {
        console.error('❌ No take returned after insert');
        return false;
      }

      console.log('✅ Take submitted successfully:', insertedTake.id);

      // CRITICAL: Re-check backend state immediately
      await checkHasPostedTodayFromBackend(user.id);
      
      // Update user streak if needed
      if (user) {
        const newStreak = (user.current_streak || 0) + 1;
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, user.longest_streak || 0),
            last_post_date: today
          })
          .eq('id', user.id);
          
        if (!profileError) {
          setUser({
            ...user,
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, user.longest_streak || 0),
            last_post_date: today
          });
        }
      }

      return true;
      
    } catch (error) {
      console.error('❌ Error in submitTake:', error);
      return false;
    } finally {
      setIsSubmittingTake(false);
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

  // ✅ ADD: Safety timeout to prevent stuck loading states (much smarter)
  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      // Only trigger if:
      // 1. Still loading after 45 seconds
      // 2. No user (prevents kicking out authenticated users)
      // 3. Not in the middle of auth flow
      if (isLoading && !user && !isCheckingPostStatus) {
        console.log('⚠️ Safety timeout triggered - forcing app to continue');
        setIsLoading(false);
        setCurrentScreen('main');
      }
    }, 45000); // Increased to 45 seconds and made smarter

    return () => clearTimeout(safetyTimeout);
  }, [isLoading, user, isCheckingPostStatus, setCurrentScreen]);

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
        checkHasPostedToday: checkHasPostedTodayFromBackend,
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
        clearUserState,
        isSubmittingTake,
        isCheckingPostStatus
      }}
    >
      {children}
    </AppContext.Provider>
  );
};