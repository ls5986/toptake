import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { supabase, handleAuthError, isValidEmail } from '@/lib/supabase';
import EmailVerificationModal from './EmailVerificationModal';
import { UsernameModal } from './UsernameModal';
import WelcomeCarousel from './WelcomeCarousel';
import { User as AppUser } from '@/types';

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
  const [onboardingStep, setOnboardingStep] = useState<'none'|'verify'|'username'|'carousel'>('none');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const handleAuthSuccess = async (authUser: any) => {
    try {
      // Check if user has a profile with username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile error:', profileError);
        setCurrentScreen('profileSetup');
        return;
      }

      if (profile && profile.username) {
        // User has complete profile - redirect to main app
        const userProfile = {
          id: profile.id,
          username: profile.username,
          bio: profile.bio || '',
          full_name: profile.full_name || '',
          avatar_url: profile.avatar_url || '',
          is_premium: profile.is_premium || false,
          is_private: profile.is_private || false,
          is_banned: profile.is_banned || false,
          is_admin: profile.is_admin || false,
          is_verified: profile.is_verified || false,
          current_streak: profile.current_streak || 0,
          longest_streak: profile.longest_streak || 0,
          last_post_date: profile.last_post_date || null,
          last_active_at: profile.last_active_at || null,
          theme_id: profile.theme_id || undefined
        };
        
        setUser(userProfile);
        setCurrentScreen('main');
        toast({ title: `Welcome back, ${profile.username}!` });
      } else {
        setOnboardingStep('username');
      }
    } catch (error) {
      console.error('Error handling authenticated user:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to load user profile. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
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

    setLoading(true);
    
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim()
      });

      if (error) throw error;

      if (data.user) {
        setPendingUserId(data.user.id);
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          setPendingEmail(cleanEmail);
          setOnboardingStep('verify');
          return;
        }
        await handleAuthSuccess(data.user);
      }
    } catch (error: unknown) {
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

      if (error) throw error;

      if (data.user) {
        setPendingUserId(data.user.id);
        setPendingEmail(cleanEmail);
        setOnboardingStep('verify');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
      
    } catch (error: unknown) {
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

  const handleUsernameComplete = () => {
    setOnboardingStep('carousel');
  };

  const handleCarouselComplete = () => {
    setShouldShowCarousel(false);
    setCurrentScreen('main');
    setOnboardingStep('none');
  };

  const handleVerified = async () => {
    if (!pendingUserId) return;
    
    try {
      // Re-fetch user
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser && authUser.email_confirmed_at) {
        await handleAuthSuccess(authUser);
      } else {
        toast({ 
          title: 'Email not verified yet', 
          description: 'Please check your inbox and click the verification link.', 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Error handling verified user:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to verify email. Please try again.',
        variant: 'destructive' 
      });
    }
  };

  if (onboardingStep === 'verify') {
    return (
      <EmailVerificationModal
        isOpen={true}
        email={pendingEmail}
        onClose={() => {}}
        onContinue={handleVerified}
      />
    );
  }

  if (onboardingStep === 'username') {
    return (
      <UsernameModal
        isOpen={true}
        onClose={() => {}}
        onComplete={handleUsernameComplete}
      />
    );
  }

  if (onboardingStep === 'carousel') {
    return (
      <WelcomeCarousel onComplete={handleCarouselComplete} />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          {!isLogin && (
            <Input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
          )}
          <Button
            onClick={isLogin ? handleLogin : handleRegister}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            disabled={loading}
          >
            {loading ? (isLogin ? 'Logging in...' : 'Creating account...') : (isLogin ? 'Login' : 'Sign Up')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full"
            disabled={loading}
          >
            {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthScreen;