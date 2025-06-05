import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import TodayPrompt from './TodayPrompt';
import { getTodayPrompt } from '@/lib/supabase';

interface DailyPromptBlockerProps {
  isBlocked: boolean;
  onSubmit: () => void;
}

export const DailyPromptBlocker = ({ isBlocked, onSubmit }: DailyPromptBlockerProps) => {
  const { user, updateStreak, setCurrentScreen, setUser, setIsAppBlocked } = useAppContext();
  const [promptText, setPromptText] = useState('');
  const [response, setResponse] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const { toast } = useToast();
  const [displayPrompt, setDisplayPrompt] = useState("What's one thing you believe but others don't?");

  useEffect(() => {
    const fetchPrompt = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('daily_prompts')
        .select('prompt_text')
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
    if (!response.trim()) {
      toast({ title: 'Please write a response', variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Please log in', variant: 'destructive' });
      return;
    }

    if (!user.username || user.username === 'User') {
      toast({ title: 'Please choose your username first', variant: 'destructive' });
      setCurrentScreen('profileSetup');
      return;
    }

    if (isAnonymous && user.anonymousCredits <= 0) {
      setShowAnonymousModal(true);
      return;
    }

    setLoading(true);
    
    try {
      // Always use UTC date for prompt_date
      const today = new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate()
      )).toISOString().split('T')[0];
      
      // Get or create today's daily prompt
      let { data: dailyPrompt } = await supabase
        .from('daily_prompts')
        .select('id')
        .eq('prompt_date', today)
        .eq('is_active', true)
        .single();
      
      if (!dailyPrompt) {
        // Create today's prompt if it doesn't exist
        const { data: newPrompt, error: promptError } = await supabase
          .from('daily_prompts')
          .insert({
            prompt_text: displayPrompt,
            prompt_date: today,
            is_active: true,
            category: 'daily',
            type: 'global'
          })
          .select('id')
          .single();
        
        if (promptError) {
          console.error('Error creating daily prompt:', promptError);
          toast({ title: "Failed to create prompt", variant: "destructive" });
          return;
        }
        dailyPrompt = newPrompt;
      }
      
      const { error } = await supabase
        .from('takes')
        .insert({
          user_id: user.id,
          content: response.trim(),
          is_anonymous: isAnonymous,
          prompt_date: today,
          daily_prompt_id: dailyPrompt.id,
          reactions: { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 }
        });

      if (error) {
        if (error.message.includes('unique_user_daily_take')) {
          toast({ title: "You've already posted today!", description: "Come back tomorrow for a new prompt.", variant: "default" });
          setUser({ ...user, hasPostedToday: true });
          setIsAppBlocked(false);
          onSubmit();
          return;
        }
        console.error('Take submission error:', error);
        toast({ title: "Failed to submit take", description: error.message, variant: "destructive" });
        return;
      }

      if (isAnonymous) {
        const newCredits = user.anonymousCredits - 1;
        await supabase
          .from('profiles')
          .update({ anonymous_credits: newCredits, has_posted_today: true })
          .eq('id', user.id);
        
        setUser({ ...user, anonymousCredits: newCredits, hasPostedToday: true });
      } else {
        await supabase
          .from('profiles')
          .update({ has_posted_today: true })
          .eq('id', user.id);
        
        setUser({ ...user, hasPostedToday: true });
      }
      
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

  const handleBuyCredits = async () => {
    if (user) {
      const newCredits = user.anonymousCredits + 5;
      await supabase
        .from('profiles')
        .update({ anonymous_credits: newCredits })
        .eq('id', user.id);
      
      setUser({ ...user, anonymousCredits: newCredits });
    }
    setShowAnonymousModal(false);
    toast({ title: "5 anonymous credits added!" });
  };

  if (!isBlocked) return null;

  return (
    <>
      <Dialog open={isBlocked} onOpenChange={() => {}}>
        <DialogContent className="bg-brand-surface border-border text-brand-text max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-brand-danger">
              <Lock className="w-6 h-6 mr-2" />
              App Locked
            </DialogTitle>
            <DialogDescription className="text-brand-muted">
              You haven't posted today — unlock the app by dropping your take
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-brand-surface p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="font-semibold text-brand-accent">Today's Prompt</span>
              </div>
              <p className="text-brand-muted">
                {displayPrompt}
              </p>
            </div>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value.slice(0, 280))}
              placeholder="Share your take... (280 characters max)"
              className="min-h-24 resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                  disabled={user?.anonymousCredits === 0}
                />
                <span className="text-sm text-brand-muted">Post anonymously</span>
              </div>
              <Badge variant="outline" className="text-brand-accent border-brand-accent">
                {user?.anonymousCredits || 0} left
              </Badge>
            </div>
            <div className="text-right text-brand-muted text-sm">
              {response.length}/280
            </div>
            <Button 
              onClick={submitResponse}
              disabled={loading || !response.trim()}
              className="btn-primary w-full"
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
        <Dialog open={showAnonymousModal} onOpenChange={setShowAnonymousModal}>
          <DialogContent className="bg-brand-surface border-brand-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-brand-text text-center">
                Out of Anonymous Posts
              </DialogTitle>
              <DialogDescription className="text-brand-muted text-center">
                Purchase more anonymous credits to post anonymously.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-center">
              <p className="text-brand-muted">
                You've used all anonymous posts. Buy 5 more for $1.99?
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={handleBuyCredits}
                  className="btn-primary w-full"
                >
                  Buy 5 Credits - $1.99
                </Button>
                <Button 
                  onClick={() => setShowAnonymousModal(false)}
                  className="btn-secondary w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};