import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { supabase, handleAuthError } from '@/lib/supabase';

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
      console.log('Getting current user...');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        console.error('Auth error:', authError);
        toast({ title: "Authentication error", description: "Please try logging in again.", variant: "destructive" });
        return;
      }

      console.log('Current user:', authUser.id, authUser.email);

      // Check if username exists
      console.log('Checking if username exists:', username.trim().toLowerCase());
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.trim().toLowerCase())
        .maybeSingle();

      if (checkError) {
        console.error('Username check error:', checkError);
      }

      if (existingUser) {
        toast({ title: "Username taken", description: "Please try another username", variant: "destructive" });
        return;
      }

      const timezoneOffset = new Date().getTimezoneOffset();
      
      // Check if profile already exists first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      let profile;
      
      if (existingProfile) {
        // Update existing profile
        console.log('Updating existing profile...');
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({ 
            username: username.trim().toLowerCase(),
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
        console.log('Creating new profile...');
        const profileData = {
          id: authUser.id,
          username: username.trim().toLowerCase(),
          email: authUser.email,
          streak: 0,
          drama_score: 0,
          anonymous_credits: 3,
          has_posted_today: false,
          timezone_offset: timezoneOffset,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: newProfile, error: profileError } = await supabase
          .from('profiles')
          .insert(profileData)
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
        
        profile = newProfile;
      }

      if (profile) {
        console.log('Profile operation successful:', profile);
        const userProfile = {
          id: profile.id,
          username: profile.username,
          email: profile.email || authUser.email || '',
          streak: profile.streak || 0,
          dramaScore: profile.drama_score || 0,
          anonymousCredits: profile.anonymous_credits || 3,
          hasPostedToday: profile.has_posted_today || false,
          timezone_offset: profile.timezone_offset || 0
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">
            Choose Your Username
          </CardTitle>
          <p className="text-gray-400">This will be your unique identifier</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="bg-gray-700 border-gray-600 text-white"
            maxLength={20}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
          />
          
          <div className="text-center">
            <Badge variant="outline" className="text-purple-400 border-purple-400">
              👻 You get 3 anonymous posts to start
            </Badge>
          </div>
          
          <Button 
            onClick={handleSubmit}
            disabled={loading || !username.trim() || username.length < 3}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {loading ? 'Setting Username...' : 'Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};