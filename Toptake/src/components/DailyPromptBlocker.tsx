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
import { useDailyPrompt } from '@/hooks/useDailyPrompt';

interface DailyPromptBlockerProps {
  isBlocked: boolean;
  onSubmit: () => void;
}

export const DailyPromptBlocker = ({ isBlocked, onSubmit }: DailyPromptBlockerProps) => {
  const { user, updateStreak, setCurrentScreen, setUser, setIsAppBlocked } = useAppContext();
  const { todaysPrompt, currentPrompt, loading: promptLoading } = useDailyPrompt();
  const [response, setResponse] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const { toast } = useToast();

  const displayPrompt = currentPrompt || todaysPrompt?.prompt_text || "What's one thing you believe but others don't?";

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
      const today = new Date().toISOString().split('T')[0];
      
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
          setUser(prev => prev ? { ...prev, hasPostedToday: true } : null);
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
        
        setUser(prev => prev ? { ...prev, anonymousCredits: newCredits, hasPostedToday: true } : null);
      } else {
        await supabase
          .from('profiles')
          .update({ has_posted_today: true })
          .eq('id', user.id);
        
        setUser(prev => prev ? { ...prev, hasPostedToday: true } : null);
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
      
      setUser(prev => prev ? { ...prev, anonymousCredits: newCredits } : null);
    }
    setShowAnonymousModal(false);
    toast({ title: "5 anonymous credits added!" });
  };

  if (!isBlocked) return null;

  return (
    <>
      <Dialog open={isBlocked} onOpenChange={() => {}}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-400">
              <Lock className="w-6 h-6 mr-2" />
              App Locked
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              🔒 You haven't posted today — unlock the app by dropping your take
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="font-semibold text-purple-400">🔥 Today's Prompt</span>
              </div>
              <p className="text-gray-300">
                {displayPrompt}
              </p>
            </div>
            
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value.slice(0, 280))}
              placeholder="Share your take... (280 characters max)"
              className="bg-gray-800 border-gray-600 text-white min-h-24 resize-none"
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={isAnonymous}
                  onCheckedChange={setIsAnonymous}
                  disabled={user?.anonymousCredits === 0}
                />
                <span className="text-sm text-gray-300">👻 Post anonymously</span>
              </div>
              <Badge variant="outline" className="text-purple-400 border-purple-400">
                {user?.anonymousCredits || 0} left
              </Badge>
            </div>
            
            <div className="text-right text-gray-400 text-sm">
              {response.length}/280
            </div>
            
            <Button 
              onClick={submitResponse} 
              disabled={loading || !response.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {loading ? 'Submitting...' : '🚀 Submit & Unlock App'}
            </Button>
            
            <p className="text-xs text-gray-400 text-center">
              You cannot access the app until you respond to today's prompt
            </p>
          </div>
        </DialogContent>
      </Dialog>
      
      {showAnonymousModal && (
        <Dialog open={showAnonymousModal} onOpenChange={setShowAnonymousModal}>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-white text-center">
                👻 Out of Anonymous Posts
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-center">
                Purchase more anonymous credits to post anonymously.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-center">
              <p className="text-gray-300">
                You've used all anonymous posts. Buy 5 more for $1.99?
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={handleBuyCredits}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
                >
                  💳 Buy 5 Credits - $1.99
                </Button>
                <Button 
                  onClick={() => setShowAnonymousModal(false)}
                  variant="outline"
                  className="w-full border-gray-600 text-white"
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