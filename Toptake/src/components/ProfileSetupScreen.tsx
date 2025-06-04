import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

const ProfileSetupScreen: React.FC = () => {
  const { setUser, setCurrentScreen, setHasCompletedOnboarding } = useAppContext();
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const timezoneOffset = new Date().getTimezoneOffset();
      
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          username: username.trim(),
          streak: 0,
          drama_score: 0,
          anon_credits: 3,
          timezone_offset: timezoneOffset
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        alert('Username might be taken. Please try another.');
        return;
      }

      setUser({
        id: data.id,
        username: data.username,
        email: authUser.email || '',
        streak: 0,
        dramaScore: 0,
        anonymousCredits: 3,
        hasPostedToday: false,
        timezone_offset: timezoneOffset
      });
      
      setHasCompletedOnboarding(true);
      setCurrentScreen('main');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-center text-2xl">
            Welcome to TopTake!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="text-white mb-2 block">
                Choose a Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/5 border-white/20 text-white placeholder:text-white/50"
                maxLength={20}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={!username.trim() || isSubmitting}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {isSubmitting ? 'Creating Profile...' : 'Get Started'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSetupScreen;