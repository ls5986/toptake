import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { supabase, handleAuthError, isValidEmail } from '@/lib/supabase';
import EmailVerificationModal from './EmailVerificationModal';
import { UsernameModal } from './UsernameModal';
import WelcomeCarousel from './WelcomeCarousel';

const AuthScreen: React.FC = () => {
  const { setUser, setCurrentScreen, setShouldShowCarousel } = useAppContext();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const { toast } = useToast();

  // Create test user for development
  const createTestUser = async () => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpass123',
        options: {
          data: {
            username: 'testuser'
          }
        }
      });
      
      if (data.user && !error) {
        console.log('Test user created successfully');
      }
    } catch (error) {
      console.log('Test user may already exist');
    }
  };

  useEffect(() => {
    createTestUser();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    
    try {
      // Try test credentials first for development
      if (email.toLowerCase() === 'test@example.com' && password === 'testpass123') {
        const testUser = {
          id: 'test-user-id',
          username: 'testuser',
          email: 'test@example.com',
          streak: 5,
          dramaScore: 100,
          anonymousCredits: 3,
          hasPostedToday: false,
          timezone_offset: 0
        };
        
        setUser(testUser);
        setCurrentScreen('main');
        toast({ title: 'Welcome back, testuser!' });
        return;
      }

      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim()
      });

      if (error) {
        console.error('Login error:', error);
        toast({ 
          title: 'Login Error', 
          description: handleAuthError(error),
          variant: 'destructive' 
        });
        return;
      }

      if (data.user) {
        // Check if user has a profile with username
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profile && profile.username) {
          // User has complete profile - redirect to main app
          const userProfile = {
            id: profile.id,
            username: profile.username,
            email: profile.email || data.user.email || '',
            streak: profile.streak || 0,
            dramaScore: profile.drama_score || 0,
            anonymousCredits: profile.anonymous_credits || 3,
            hasPostedToday: profile.has_posted_today || false,
            timezone_offset: profile.timezone_offset || 0
          };
          
          setUser(userProfile);
          setCurrentScreen('main');
          toast({ title: `Welcome back, ${profile.username}!` });
        } else {
          // User exists but needs to complete profile setup
          setShowUsernameModal(true);
        }
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({ 
        title: 'Login failed', 
        description: handleAuthError(error),
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      toast({ title: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    if (!isValidEmail(email)) {
      toast({ 
        title: 'Invalid Email', 
        description: 'Please enter a valid email address',
        variant: 'destructive' 
      });
      return;
    }

    if (password.length < 6) {
      toast({ 
        title: 'Password Too Short', 
        description: 'Password must be at least 6 characters long',
        variant: 'destructive' 
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({ 
        title: 'Passwords Don\'t Match', 
        description: 'Please make sure both passwords are the same',
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password.trim()
      });

      if (error) {
        console.error('Registration error:', error);
        toast({ 
          title: 'Registration Error', 
          description: handleAuthError(error),
          variant: 'destructive' 
        });
        return;
      }

      if (data.user) {
        // Skip email verification for development and proceed to username setup
        setShowUsernameModal(true);
        toast({ 
          title: 'Registration Successful!', 
          description: 'Please choose your username.' 
        });
        
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
      
    } catch (error: any) {
      console.error('Registration failed:', error);
      toast({ 
        title: 'Registration Failed', 
        description: handleAuthError(error),
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameComplete = async () => {
    setShowUsernameModal(false);
    setShowCarousel(true);
  };

  const handleCarouselComplete = () => {
    setShowCarousel(false);
    setShouldShowCarousel(false);
    setCurrentScreen('main');
  };

  if (showCarousel) {
    return <WelcomeCarousel onComplete={handleCarouselComplete} />;
  }

  return (
    <>
      <div className="w-full h-full min-h-screen bg-gradient-to-br from-brand-background via-brand-surface to-brand-background flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md bg-brand-surface border-brand-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-brand-text">
              {isLogin ? 'Welcome Back' : 'Join TopTake'}
            </CardTitle>
            <p className="text-brand-muted mt-2">
              {isLogin ? 'Sign in to your account' : 'Create your account to get started'}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-brand-background border-brand-border text-brand-text placeholder:text-brand-muted"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="bg-brand-background border-brand-border text-brand-text placeholder:text-brand-muted"
            />
            {isLogin ? null : (
              <Input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-brand-background border-brand-border text-brand-text placeholder:text-brand-muted"
              />
            )}
            <Button 
              onClick={isLogin ? handleLogin : handleRegister} 
              disabled={loading || !email || !password || (!isLogin && !confirmPassword)}
              className="w-full bg-brand-primary hover:bg-brand-accent text-brand-text"
            >
              {loading ? (isLogin ? 'Signing in...' : 'Registering...') : (isLogin ? 'Sign In' : 'Register')}
            </Button>
            <div className="text-xs text-brand-muted text-center space-y-1">
              <p>Super Admin: lindsey@letsclink.com / superadmin123</p>
              <p>Regular Admin: any email / admin123</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <UsernameModal
        isOpen={showUsernameModal}
        onClose={() => {}}
        onComplete={handleUsernameComplete}
      />
    </>
  );
};

export default AuthScreen;