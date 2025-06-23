import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { MonetizationModals } from './MonetizationModals';

interface DailyPromptBlockerProps {
  isBlocked: boolean;
  onSubmit: () => void;
}

export const DailyPromptBlocker = ({ isBlocked, onSubmit }: DailyPromptBlockerProps) => {
  const { user, updateStreak, setCurrentScreen, setUser, setIsAppBlocked, userCredits, setHasPostedToday, checkHasPostedToday } = useAppContext();
  const [promptText, setPromptText] = useState('');
  const [response, setResponse] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const { toast } = useToast();
  const [promptInfo, setPromptInfo] = useState({ id: null, prompt_text: "What's one thing you believe but others don't?" });

  const canPostAnonymously = user && userCredits.anonymous > 0;

  // Function to get the current user's access token with timeout
  const getAccessToken = async () => {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('getSession timeout')), 5000));
    const sessionResult = await Promise.race([supabase.auth.getSession(), timeout]);
    const result = sessionResult as { data?: { session?: { access_token?: string } } };
    return result?.data?.session?.access_token;
  };

  // Function to create headers with auth token
  const createAuthHeaders = async () => {
    const token = await getAccessToken();
    return {
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhanR4bmdicnVqbG9wenFqdmZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1NjU5ODEsImV4cCI6MjA2NDE0MTk4MX0.N-UphTEKPeFwxy8yoCpQCJYcsknHL8QTRuE4jzThLWw',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    };
  };

  useEffect(() => {
    const fetchPrompt = async () => {
      const today = new Date().toLocaleDateString('en-CA');
      try {
        const headers = await createAuthHeaders();
        const response = await fetch(`https://qajtxngbrujlopzqjvfj.supabase.co/rest/v1/daily_prompts?prompt_date=eq.${today}&select=prompt_text,id`, {
          headers: {
            ...headers,
            'Content-Type': undefined, // Remove Content-Type for GET requests
            'Prefer': undefined
          }
        });
        const data = await response.json();
        if (data && data.length > 0 && data[0].prompt_text) {
          setPromptInfo({ id: data[0].id, prompt_text: data[0].prompt_text });
        } else {
          setPromptInfo({ id: null, prompt_text: "No prompt for today!" });
        }
      } catch (error) {
        console.error('Error fetching prompt:', error);
        setPromptInfo({ id: null, prompt_text: "Error loading prompt" });
      }
    };
    fetchPrompt();
  }, []);

  const submitResponse = async () => {
    console.log('submitResponse CALLED');
    if (!user) return;

    // Validate content length
    const trimmedContent = response.trim();
    if (trimmedContent.length < 1 || trimmedContent.length > 2000) {
      toast({ 
        title: "Invalid content length", 
        description: "Your take must be between 1 and 2000 characters.",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    
    try {
      const today = new Date().toLocaleDateString('en-CA');
      if (!promptInfo.id) {
        toast({ title: "No prompt found for today", variant: "destructive" });
        setLoading(false);
        return;
      }
      const dailyPrompt = { id: promptInfo.id };

      // ADD LOGGING AND ERROR HANDLING FOR AUTH HEADERS
      let headers;
      try {
        console.log('About to call createAuthHeaders()');
        headers = await createAuthHeaders();
        console.log('Headers from createAuthHeaders:', headers);
      } catch (err) {
        console.error('Error in createAuthHeaders or getAccessToken:', err);
        setLoading(false);
        toast({ title: "Auth/session error", description: err.message, variant: "destructive" });
        return;
      }

      // Check if user has already posted today using fetch with auth
      console.log('[FETCH] GET takes (check existing)');
      const existingResponse = await fetch(`https://qajtxngbrujlopzqjvfj.supabase.co/rest/v1/takes?user_id=eq.${user.id}&prompt_id=eq.${dailyPrompt.id}&select=id`, {
        headers: {
          ...headers,
          'Content-Type': undefined, // Remove Content-Type for GET requests
          'Prefer': undefined
        }
      });
      console.log('[FETCH DONE] GET takes (check existing)', existingResponse);
      
      const existingData = await existingResponse.json();
      console.log('Existing take check:', { existingData });

      if (existingData && existingData.length > 0) {
        toast({ 
          title: "You've already posted today!", 
          description: "Come back tomorrow for a new prompt.", 
          variant: "default" 
        });
        setUser({ ...user, last_post_date: today });
        setIsAppBlocked(false);
        onSubmit();
        setLoading(false);
        return;
      }

      // Prepare insert data
      const insertData = {
        user_id: user.id,
        content: trimmedContent,
        is_anonymous: isAnonymous,
        prompt_date: today,
        prompt_id: dailyPrompt.id,
        created_at: new Date().toISOString()
      };
      console.log('Starting submission with data:', insertData);

      // Insert the take using fetch with auth
      console.log('[FETCH] POST takes');
      const insertResponse = await fetch('https://qajtxngbrujlopzqjvfj.supabase.co/rest/v1/takes', {
        method: 'POST',
        headers,
        body: JSON.stringify(insertData)
      });
      console.log('[FETCH DONE] POST takes', insertResponse);

      if (!insertResponse.ok) {
        const errorData = await insertResponse.json();
        console.error('Database error:', errorData);
        toast({ 
          title: "Failed to submit take", 
          description: errorData.message || 'Database error', 
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }

      console.log('Insert successful');

      // Record engagement analytics
      try {
        const analyticsData = {
          user_id: user.id,
          action_type: 'submit_take',
          metadata: {
            prompt_id: dailyPrompt.id,
            prompt_date: today,
            is_anonymous: isAnonymous
          },
          created_at: new Date().toISOString()
        };
        console.log('[FETCH] POST engagement_analytics');
        const analyticsResponse = await fetch('https://qajtxngbrujlopzqjvfj.supabase.co/rest/v1/engagement_analytics', {
          method: 'POST',
          headers,
          body: JSON.stringify(analyticsData)
        });
        console.log('[FETCH DONE] POST engagement_analytics', analyticsResponse);
        if (!analyticsResponse.ok) {
          console.error('Analytics error:', await analyticsResponse.json());
        }
      } catch (err) {
        console.error('Analytics insert failed:', err);
      }

      // Handle anonymous credit usage
      if (isAnonymous) {
        try {
          const creditData = { balance: userCredits.anonymous - 1 };
          console.log('[FETCH] PATCH user_credits');
          const creditResponse = await fetch(`https://qajtxngbrujlopzqjvfj.supabase.co/rest/v1/user_credits?user_id=eq.${user.id}&credit_type=eq.anonymous`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(creditData)
          });
          console.log('[FETCH DONE] PATCH user_credits', creditResponse);
          if (!creditResponse.ok) {
            console.error('Credit update error:', await creditResponse.json());
          }
        } catch (err) {
          console.error('Credit update failed:', err);
        }
      }

      // Update user's last post date and streak
      try {
        const profileData = { 
          last_post_date: today,
          current_streak: user.current_streak + 1,
          longest_streak: Math.max(user.current_streak + 1, user.longest_streak || 0)
        };
        console.log('[FETCH] PATCH profiles');
        const profileResponse = await fetch(`https://qajtxngbrujlopzqjvfj.supabase.co/rest/v1/profiles?id=eq.${user.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(profileData)
        });
        console.log('[FETCH DONE] PATCH profiles', profileResponse);
        if (!profileResponse.ok) {
          console.error('Profile update error:', await profileResponse.json());
        }
      } catch (err) {
        console.error('Profile update failed:', err);
      }

      // Update local state only after successful database operations
      await checkHasPostedToday();
      setUser({
        ...user!,
        current_streak: user!.current_streak + 1,
        last_post_date: today,
        longest_streak: Math.max((user!.current_streak || 0) + 1, user!.longest_streak || 0)
      });
      setIsAppBlocked(false);
      await updateStreak();
      toast({ title: "Take submitted successfully!" });
      onSubmit();
    } catch (err) {
      console.error('Submission failed:', err);
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCredits = () => {
    setShowAnonymousModal(true);
  };

  // Log button state before rendering
  console.log('DailyPromptBlocker render:', {
    responseTrim: response.trim(),
    loading,
    buttonDisabled: loading || !response.trim()
  });

  if (!isBlocked) return null;

  return (
    <>
      <Dialog open={isBlocked} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Today's Prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-brand-surface rounded-lg">
              <p className="text-brand-text">{promptInfo.prompt_text}</p>
            </div>
            
            <div className="space-y-2">
              <Textarea
                placeholder="Write your take..."
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                className="min-h-[150px] bg-brand-surface border-brand-border text-brand-text"
                maxLength={2000}
              />
              <div className="text-xs text-brand-muted text-right">
                {response.length}/2000 characters
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
                disabled={!canPostAnonymously}
              />
              <Label htmlFor="anonymous" className="text-sm">
                Post anonymously {!canPostAnonymously && "(No credits remaining)"}
              </Label>
              {!canPostAnonymously && (
                <Button
                  variant="link"
                  onClick={handleBuyCredits}
                  className="text-sm text-brand-primary"
                >
                  Buy credits
                </Button>
              )}
            </div>
            
            <Button 
              onClick={submitResponse}
              disabled={loading || !response.trim()}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {loading ? 'Submitting...' : 'Submit & Unlock App'}
            </Button>
            <p className="text-xs text-brand-muted text-center">
              You cannot access the app until you respond to today's prompt
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {showAnonymousModal && (
        <MonetizationModals
          onClose={() => setShowAnonymousModal(false)}
          onSuccess={() => {
            setShowAnonymousModal(false);
            // Refresh user credits after purchase
            // You might want to add a function to refresh credits here
          }}
        />
      )}
    </>
  );
};