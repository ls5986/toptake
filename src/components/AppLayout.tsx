import React, { Suspense, useEffect, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import LoadingSpinner from './LoadingSpinner';
import LandingPage from './LandingPage';
import EnhancedAdminScreen from './EnhancedAdminScreen';
import SuperAdminScreen from './SuperAdminScreen';
import AdminLogin from './AdminLogin';
import TakePage from './TakePage';
import { DailyPromptBlocker } from './DailyPromptBlocker';
import { supabase } from '@/lib/supabase';

// Lazy load components to improve initial load time
const AuthScreen = React.lazy(() => import('./AuthScreen'));
const WelcomeCarousel = React.lazy(() => import('./WelcomeCarousel'));
const MainAppScreen = React.lazy(() => import('./MainAppScreen'));
const FriendsScreen = React.lazy(() => import('./FriendsScreen'));

const AppLayout: React.FC = () => {
  const { 
    currentScreen, 
    isAuthenticated, 
    user, 
    shouldShowCarousel, 
    setCurrentScreen, 
    currentTakeId,
    hasPostedToday,
    submitTake,
    clearUserState
  } = useAppContext();
  const [isAdminMode, setIsAdminMode] = React.useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  const [showAdminLogin, setShowAdminLogin] = React.useState(false);
  const [isValidatingSession, setIsValidatingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);

  // Validate session on mount and when user changes
  useEffect(() => {
    const validateSession = async () => {
      try {
        console.log('AppLayout: Validating session...');
        setIsValidatingSession(true);
        
        // Check if we have a user in context
        if (!user) {
          console.log('AppLayout: No user in context, session invalid');
          setHasValidSession(false);
          setIsValidatingSession(false);
          return;
        }

        // Check Supabase session with timeout
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('getSession timeout')), 5000))
        ]);

        const session = sessionResult?.data?.session;
        
        if (!session) {
          console.log('AppLayout: No Supabase session found');
          setHasValidSession(false);
          setIsValidatingSession(false);
          clearUserState();
          return;
        }

        // Verify the session user matches our context user
        if (session.user.id !== user.id) {
          console.log('AppLayout: Session user ID mismatch', {
            sessionUserId: session.user.id,
            contextUserId: user.id
          });
          setHasValidSession(false);
          setIsValidatingSession(false);
          clearUserState();
          return;
        }

        console.log('AppLayout: Session is valid');
        setHasValidSession(true);
        setIsValidatingSession(false);
      } catch (error) {
        console.error('AppLayout: Session validation failed:', error);
        setHasValidSession(false);
        setIsValidatingSession(false);
        clearUserState();
      }
    };

    validateSession();
  }, [user, clearUserState]);

  // Check if current user is superadmin (ljstevens)
  const isUserSuperAdmin = user?.username === 'ljstevens';

  // Check for admin access via URL or key combination
  React.useEffect(() => {
    const checkAdminAccess = () => {
      if (window.location.hash === '#admin' || window.location.search.includes('admin=true')) {
        setShowAdminLogin(true);
      }
    };
    
    checkAdminAccess();
    
    // Listen for Ctrl+Shift+A to open admin login
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        setShowAdminLogin(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAdminLogin = (isSuperAdminLogin: boolean) => {
    setShowAdminLogin(false);
    setIsAdminMode(true);
    setIsSuperAdmin(isSuperAdminLogin);
  };

  const handleExitAdmin = () => {
    setIsAdminMode(false);
    setIsSuperAdmin(false);
    setShowAdminLogin(false);
    window.location.hash = '';
  };

  const handleGetStarted = () => {
    setCurrentScreen('auth');
  };

  // Show loading while validating session
  if (isValidatingSession) {
    return <LoadingSpinner />;
  }

  // Show admin login screen
  if (showAdminLogin) {
    return <AdminLogin onAdminLogin={handleAdminLogin} />;
  }

  // Admin mode rendering
  if (isAdminMode) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="bg-brand-primary text-brand-text p-3 text-center">
          <div className="flex items-center justify-center space-x-4">
            <span className="text-lg font-semibold">
              {isSuperAdmin ? 'SUPER ADMIN MODE' : 'AI-POWERED ADMIN HUB'}
            </span>
            <button 
              onClick={handleExitAdmin}
              className="btn-secondary px-4 py-1 rounded-full text-sm"
            >
              Exit Admin
            </button>
          </div>
        </div>
        {isSuperAdmin ? <SuperAdminScreen /> : <EnhancedAdminScreen />}
      </div>
    );
  }

  const renderScreen = () => {
    try {
      // If no valid session, show landing page first
      if (!hasValidSession && currentScreen === 'main') {
        return <LandingPage onGetStarted={handleGetStarted} />;
      }

      // If no valid session, show auth screen
      if (!hasValidSession) {
        return <AuthScreen />;
      }

      // If authenticated but needs onboarding
      if (shouldShowCarousel || currentScreen === 'welcome') {
        return <WelcomeCarousel />;
      }

      // If authenticated but no username (needs profile setup)
      if (user && !user.username) {
        setCurrentScreen('welcome');
        return <WelcomeCarousel />;
      }

      // If user is on friends screen
      if (currentScreen === 'friends') {
        return <FriendsScreen />;
      }

      // If user is on take page
      if (currentScreen === 'take') {
        return <TakePage takeId={currentTakeId} />;
      }

      // Default authenticated main screen with all features
      return <MainAppScreen />;
    } catch (error) {
      console.error('Error rendering screen:', error);
      return <LoadingSpinner />;
    }
  };

  // If user has valid session and hasn't posted today, show AppBlocker
  const shouldBlock = hasValidSession && user && !hasPostedToday && !isAdminMode;

  // Debug logging
  console.log('AppLayout Debug:', {
    hasValidSession,
    isAuthenticated,
    userId: user?.id,
    hasPostedToday,
    isAdminMode,
    shouldBlock,
    user,
    currentScreen,
    shouldShowCarousel,
    // Add more detailed state
    userState: {
      id: user?.id,
      username: user?.username,
      hasPostedToday: user?.hasPostedToday,
      last_post_date: user?.last_post_date
    },
    blockingState: {
      hasValidSession,
      isAuthenticated,
      hasUser: !!user,
      hasNotPostedToday: !hasPostedToday,
      isNotAdmin: !isAdminMode,
      shouldBlock
    }
  });

  // Force block if user has valid session but hasn't posted
  const forceBlock = hasValidSession && user && !hasPostedToday;

  console.log('AppBlocker Render State:', {
    forceBlock,
    hasValidSession,
    hasUser: !!user,
    hasNotPostedToday: !hasPostedToday,
    willRender: forceBlock
  });

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {forceBlock ? (
        <>
          {console.log('Rendering DailyPromptBlocker')}
          <DailyPromptBlocker 
            isBlocked={true}
            onSubmit={() => {
              console.log('DailyPromptBlocker onSubmit called');
              // The hasPostedToday state is now properly updated in the component
              // The app will automatically transition to the main screen
            }}
          />
        </>
      ) : (
        <>
          {console.log('Rendering main content')}
          {renderScreen()}
        </>
      )}
    </Suspense>
  );
};

export default AppLayout;