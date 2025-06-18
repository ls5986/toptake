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
  const { user, updateStreak, setCurrentScreen, setUser, setIsAppBlocked, userCredits } = useAppContext();
  const [promptText, setPromptText] = useState('');
  const [response, setResponse] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const { toast } = useToast();
  const [displayPrompt, setDisplayPrompt] = useState("What's one thing you believe but others don't?");

  const canPostAnonymously = user && userCredits.anonymous > 0;

  useEffect(() => {
    const fetchPrompt = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('daily_prompts')
        .select('prompt_text, id')
        .eq('prompt_date', today)
        .single();
      if (data && data.prompt_text) {
        setDisplayPrompt(data.prompt_text);
      } else {
        setDisplayPrompt("No prompt for today!");
      }
    };
    fetchPrompt();
  }, []);

  const submitResponse = async () => {
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
      const today = new Date().toISOString().split('T')[0];

      // Get today's prompt
      const { data: dailyPrompt, error: promptError } = await supabase
        .from('daily_prompts')
        .select('id')
        .eq('prompt_date', today)
        .single();

      if (promptError) {
        console.error('Error fetching prompt:', promptError);
        toast({ title: "Error fetching prompt", variant: "destructive" });
        return;
      }

      // Check if user has already posted today
      const { data: existingTake } = await supabase
        .from('takes')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_date', today)
        .single();

      if (existingTake) {
        toast({ 
          title: "You've already posted today!", 
          description: "Come back tomorrow for a new prompt.", 
          variant: "default" 
        });
        setUser({ ...user, last_post_date: today });
        setIsAppBlocked(false);
        onSubmit();
        return;
      }

      // Start a transaction
      const { error: takeError } = await supabase
        .from('takes')
        .insert({
          user_id: user.id,
          content: trimmedContent,
          is_anonymous: isAnonymous,
          prompt_date: today,
          daily_prompt_id: dailyPrompt.id,
          created_at: new Date().toISOString()
        });

      if (takeError) {
        console.error('Take submission error:', takeError);
        toast({ 
          title: "Failed to submit take", 
          description: takeError.message, 
          variant: "destructive" 
        });
        return;
      }

      // Record engagement analytics
      const { error: analyticsError } = await supabase
        .from('engagement_analytics')
        .insert({
          user_id: user.id,
          action_type: 'submit_take',
          metadata: {
            prompt_id: dailyPrompt.id,
            prompt_date: today,
            is_anonymous: isAnonymous
          },
          created_at: new Date().toISOString()
        });

      if (analyticsError) {
        console.error('Analytics error:', analyticsError);
      }

      // Handle anonymous credit usage
      if (isAnonymous) {
        const { error: creditError } = await supabase
          .from('user_credits')
          .update({ balance: userCredits.anonymous - 1 })
          .eq('user_id', user.id)
          .eq('credit_type', 'anonymous');

        if (creditError) {
          console.error('Credit update error:', creditError);
        }
      }

      // Update user's last post date and streak
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          last_post_date: today,
          current_streak: user.current_streak + 1,
          longest_streak: Math.max(user.current_streak + 1, user.longest_streak || 0)
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      // Update local state
      setUser({ 
        ...user, 
        last_post_date: today,
        current_streak: user.current_streak + 1,
        longest_streak: Math.max(user.current_streak + 1, user.longest_streak || 0)
      });
      
      await updateStreak();
      setIsAppBlocked(false);
      toast({ title: "Take submitted successfully!" });
      onSubmit();
    } catch (err) {
      console.error('Submission error:', err);
      toast({ title: "An error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBuyCredits = () => {
    setShowAnonymousModal(true);
  };

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
              <p className="text-brand-text">{displayPrompt}</p>
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
      
      <MonetizationModals
        showAnonymousModal={showAnonymousModal}
        showStreakModal={false}
        showPremiumModal={false}
        showBoostModal={false}
        onClose={() => setShowAnonymousModal(false)}
        onPurchase={() => {}}
      />
    </>
  );
};