import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { handleAuthError } from '@/lib/supabase';
import { CreditType } from '@/lib/credits';

interface UsernameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const UsernameModal: React.FC<UsernameModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { setUser } = useAppContext();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!username.trim() || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      toast({ title: "Please enter a valid username (3-20 chars, letters/numbers/underscore only)", variant: "destructive" });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('Auth error:', authError);
        toast({ title: "Authentication error", description: "Please try logging in again.", variant: "destructive" });
        return;
      }

      // Check if username exists
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle();

      if (checkError) {
        console.error('Username check error:', checkError);
        throw checkError;
      }

      if (existingUser) {
        toast({ title: "Username taken", description: "Please try another username", variant: "destructive" });
        return;
      }

      // Get user's timezone offset in minutes
      const timezoneOffset = new Date().getTimezoneOffset();
      
      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      let profile;
      
      if (existingProfile) {
        // Update existing profile
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({ 
            username: username.trim().toLowerCase(),
            timezone_offset: timezoneOffset,
            updated_at: new Date().toISOString()
          })
          .eq('id', authUser.id)
          .select()
          .single();
          
        if (updateError) {
          console.error('Profile update error:', updateError);
          toast({ 
            title: "Failed to update profile", 
            description: handleAuthError(updateError),
            variant: "destructive" 
          });
          return;
        }
        
        profile = updatedProfile;
      } else {
        // Create new profile
        const newProfile = {
          id: authUser.id,
          username: username.trim().toLowerCase(),
          email: authUser.email,
          current_streak: 0,
          timezone_offset: timezoneOffset,
          is_premium: false,
          is_private: false,
          is_banned: false,
          is_admin: false,
          is_verified: false,
          longest_streak: 0,
          last_post_date: null,
          last_active_at: new Date().toISOString(),
          full_name: '',
          bio: '',
          avatar_url: ''
        };

        const { data: newProfileData, error: profileError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (profileError) {
          console.error('Profile creation error:', profileError);
          toast({ 
            title: "Failed to create profile", 
            description: handleAuthError(profileError),
            variant: "destructive" 
          });
          return;
        }
        
        profile = newProfileData;

        // Initialize all credit types for new users
        const creditTypes: CreditType[] = ['anonymous', 'late_submit', 'sneak_peek', 'boost', 'extra_takes', 'delete'];
        const initialCredits = {
          anonymous: 3,
          late_submit: 0,
          sneak_peek: 0,
          boost: 0,
          extra_takes: 0,
          delete: 0
        };

        // Create credit entries for each type
        const { error: creditsError } = await supabase
          .from('user_credits')
          .insert(
            creditTypes.map(type => ({
              user_id: authUser.id,
              credit_type: type,
              balance: initialCredits[type]
            }))
          );

        if (creditsError) {
          console.error('Credit initialization error:', creditsError);
          toast({ 
            title: "Warning", 
            description: "Profile created but failed to initialize credits. Please contact support.",
            variant: "destructive"
          });
        }
      }

      if (profile) {
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
        toast({ title: "Username set successfully!" });
        onComplete();
      }
    } catch (err: any) {
      console.error('Profile operation error:', err);
      toast({ 
        title: "Failed to set username", 
        description: handleAuthError(err),
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose Your Username</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-brand-surface border-brand-border text-brand-text"
            disabled={loading}
          />
          <Button 
            onClick={handleSubmit} 
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            disabled={loading}
          >
            {loading ? 'Setting Username...' : 'Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};