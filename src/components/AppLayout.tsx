import React, { Suspense } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import LoadingSpinner from './LoadingSpinner';
import LandingPage from './LandingPage';
import { DailyPromptBlocker } from './DailyPromptBlocker';

// Lazy load components to improve initial load time
const AuthScreen = React.lazy(() => import('./AuthScreen'));
const WelcomeCarousel = React.lazy(() => import('./WelcomeCarousel'));
const MainAppScreen = React.lazy(() => import('./MainAppScreen'));
const TakePage = React.lazy(() => import('./TakePage'));

const AppLayout: React.FC = () => {
  const { 
    currentScreen,
    user,
    shouldShowCarousel,
    hasPostedToday,
    isLoading,
    currentTakeId
  } = useAppContext();

  console.log('📱 AppLayout render:', {
    isLoading,
    hasUser: !!user,
    hasPostedToday,
    currentScreen,
    shouldShowCarousel
  });

  // Show loading while initializing
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Unauthenticated users
  if (!user) {
    if (currentScreen === 'main') {
      return <LandingPage onGetStarted={() => {}} />;
    }
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AuthScreen />
      </Suspense>
    );
  }

  // New users need onboarding
  if (shouldShowCarousel || currentScreen === 'welcome' || !user.username) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <WelcomeCarousel />
      </Suspense>
    );
  }

  // ✅ CRITICAL: Show blocker if user hasn't posted today
  if (!hasPostedToday) {
    console.log('🚫 Showing blocker - user has not posted today');
    return (
      <DailyPromptBlocker 
        isBlocked={true}
        onSubmit={() => {
          console.log('✅ Take submitted from blocker');
          // hasPostedToday will be updated by submitTake
          // App will automatically re-render with main content
        }}
      />
    );
  }

  // Specific screens
  if (currentScreen === 'take') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <TakePage takeId={currentTakeId} />
      </Suspense>
    );
  }

  // Main app content
  console.log('✅ Showing main app - user posted today');
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MainAppScreen />
    </Suspense>
  );
};

export default AppLayout;