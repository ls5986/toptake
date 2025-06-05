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
import { getTodayPrompt } from '@/lib/supabase';

interface AppBlockerProps {
  isBlocked: boolean;
  onSubmit: () => void;
}

export const AppBlocker = ({ isBlocked, onSubmit }: AppBlockerProps) => {
  const { user, updateStreak, setUser, submitTake } = useAppContext();
  const [response, setResponse] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const { toast } = useToast();

  // Prompt state
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [promptLoading, setPromptLoading] = useState(true);

  useEffect(() => {
    const fetchPrompt = async () => {
      setPromptLoading(true);
      // Always use UTC date
      const today = new Date(Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate()
      )).toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('prompt_text')
        .eq('prompt_date', today)
        .single();
      setCurrentPrompt(data?.prompt_text || '');
      setPromptLoading(false);
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

    if (isAnonymous && user.anonymousCredits <= 0) {
      setShowAnonymousModal(true);
      return;
    }

    setLoading(true);
    
    try {
      const success = await submitTake(response.trim(), isAnonymous);
      
      if (success) {
        if (isAnonymous) {
          const newCredits = user.anonymousCredits - 1;
          await supabase
            .from('profiles')
            .update({ anonymous_credits: newCredits })
            .eq('id', user.id);
          
          setUser({ ...user, anonymousCredits: newCredits });
        }
        
        toast({ title: "Take submitted successfully!" });
        onSubmit();
      } else {
        // Check if user has already posted today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingTake } = await supabase
          .from('takes')
          .select('id')
          .eq('user_id', user.id)
          .eq('prompt_date', today)
          .limit(1);
        
        if (existingTake && existingTake.length > 0) {
          toast({ title: "You've already posted today!", description: "Come back tomorrow for a new prompt.", variant: "default" });
          setUser({ ...user, hasPostedToday: true });
          onSubmit();
        } else {
          toast({ title: "Failed to submit take", variant: "destructive" });
        }
      }
    } catch (err) {
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
      <div className="fixed inset-0 bg-brand-background bg-opacity-80 z-50 flex items-center justify-center p-4">
        <div className="bg-brand-surface border border-border text-brand-text max-w-md w-full rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-2">
              <Lock className="w-8 h-8 text-brand-danger mr-2" />
              <h2 className="text-xl font-bold text-brand-danger">App Locked</h2>
            </div>
            <p className="text-brand-muted">
              You haven't posted today — unlock the app by dropping your take
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-brand-surface p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="font-semibold text-brand-accent">Today's Prompt</span>
              </div>
              {promptLoading ? (
                <div className="animate-pulse bg-brand-muted h-4 rounded"></div>
              ) : (
                <p className="text-brand-muted">{currentPrompt}</p>
              )}
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
                <span className="text-sm text-brand-muted">👻 Post anonymously</span>
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
              {loading ? 'Submitting...' : '🚀 Submit & Unlock App'}
            </Button>
            
            <p className="text-xs text-brand-muted text-center">
              You cannot access the app until you respond to today's prompt
            </p>
          </div>
        </div>
      </div>
      
      {showAnonymousModal && (
        <Dialog open={showAnonymousModal} onOpenChange={setShowAnonymousModal}>
          <DialogContent className="bg-brand-surface border-brand-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-brand-text text-center">
                👻 Out of Anonymous Posts
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