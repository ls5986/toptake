import React, { Suspense } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import LoadingSpinner from './LoadingSpinner';
import LandingPage from './LandingPage';
import EnhancedAdminScreen from './EnhancedAdminScreen';
import SuperAdminScreen from './SuperAdminScreen';
import AdminLogin from './AdminLogin';
import TakePage from './TakePage';

// Lazy load components to improve initial load time
const AuthScreen = React.lazy(() => import('./AuthScreen'));
const ProfileSetupScreen = React.lazy(() => import('./ProfileSetupScreen'));
const WelcomeCarousel = React.lazy(() => import('./WelcomeCarousel'));
const MainAppScreen = React.lazy(() => import('./MainAppScreen'));
const FriendsScreen = React.lazy(() => import('./FriendsScreen'));

const AppLayout: React.FC = () => {
  const { currentScreen, isAuthenticated, user, shouldShowCarousel, setCurrentScreen, currentTakeId } = useAppContext();
  const [isAdminMode, setIsAdminMode] = React.useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  const [showAdminLogin, setShowAdminLogin] = React.useState(false);

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
      // If not authenticated, show landing page first
      if (!isAuthenticated && currentScreen === 'main') {
        return <LandingPage onGetStarted={handleGetStarted} />;
      }

      // If not authenticated and on auth screen, show auth
      if (!isAuthenticated) {
        return <AuthScreen />;
      }

      // If authenticated but needs onboarding
      if (shouldShowCarousel || currentScreen === 'welcome') {
        return <WelcomeCarousel />;
      }

      // If authenticated but no username (needs profile setup)
      if (currentScreen === 'profileSetup' || (user && !user.username)) {
        return <ProfileSetupScreen />;
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

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {renderScreen()}
    </Suspense>
  );
};

export default AppLayout;