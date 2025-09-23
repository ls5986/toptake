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
    currentTakeId,
    setCurrentScreen,
    isBlocked
  } = useAppContext();

  console.log('📱 AppLayout render:', {
    isLoading,
    hasUser: !!user,
    hasPostedToday,
    currentScreen,
    shouldShowCarousel
  });

  // Debug overlay when ?debug=1
  const showDebug = (() => { try { return new URLSearchParams(window.location.search).get('debug') === '1'; } catch { return false; } })();
  const DebugOverlay = () => (
    <div style={{ position: 'fixed', bottom: 8, right: 8, zIndex: 9999, background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '8px 10px', borderRadius: 6, fontSize: 12 }}>
      <div>screen: {currentScreen}</div>
      <div>loading: {String(isLoading)}</div>
      <div>user: {String(!!user)}</div>
      <div>postedToday: {String(hasPostedToday)}</div>
    </div>
  );

  // Manual refresh handler
  const handleManualRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    window.location.reload();
  };

  // Debug panel for development
  const showDebugPanel = process.env.NODE_ENV === 'development';

  // Show loading while initializing
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner />
        <div className="mt-4 text-center">
          <p className="text-gray-600 mb-2">Loading TopTake...</p>
          <button
            onClick={handleManualRefresh}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            🔄 Refresh if stuck
          </button>
        </div>
        {showDebugPanel && (
          <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
            <div>Debug: {currentScreen}</div>
            <div>User: {user ? 'Yes' : 'No'}</div>
            <div>Posted: {hasPostedToday ? 'Yes' : 'No'}</div>
          </div>
        )}
        {showDebug && <DebugOverlay />}
      </div>
    );
  }

  // Unauthenticated users
  if (!user) {
    console.log('🔐 No user, currentScreen:', currentScreen);
    if (currentScreen === 'main') {
      console.log('🏠 Showing LandingPage');
      return <>
        {showDebug && <DebugOverlay />}
        <LandingPage onGetStarted={() => {
        console.log('🚀 Get Started clicked, setting screen to auth');
        setCurrentScreen('auth');
        }} />
      </>;
    }
    console.log('🔑 Showing AuthScreen');
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <AuthScreen />
      </Suspense>
    );
  }

  // Onboarding carousel – show only when explicitly requested
  if (shouldShowCarousel || currentScreen === 'welcome' || (!user.username && currentScreen !== 'profileSetup')) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <WelcomeCarousel onComplete={() => {
          // After the carousel, route to username setup if not set yet
          setCurrentScreen('profileSetup');
        }} />
      </Suspense>
    );
  }

  // ✅ CRITICAL: Show blocker only if app is blocked and user hasn't posted today
  if (isLoading === false && isBlocked && !hasPostedToday) {
    console.log('🚫 Showing blocker - user has not posted today');
    return (
      <DailyPromptBlocker 
        isBlocked={true}
        onSubmit={() => {
          console.log('✅ Take submitted from blocker');
          // submitTake updates hasPostedToday; App will re-render
        }}
      />
    );
  }

  // Remove direct user profile view; always use MainAppScreen shell so header/nav are consistent

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