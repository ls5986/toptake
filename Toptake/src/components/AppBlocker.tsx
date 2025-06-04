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

interface AppBlockerProps {
  isBlocked: boolean;
  onSubmit: () => void;
}

export const AppBlocker = ({ isBlocked, onSubmit }: AppBlockerProps) => {
  const { user, updateStreak, setUser, submitTake } = useAppContext();
  const { prompt, loading: promptLoading } = useDailyPrompt();
  const [response, setResponse] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const { toast } = useToast();

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
          
          setUser(prev => prev ? { ...prev, anonymousCredits: newCredits } : null);
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
          setUser(prev => prev ? { ...prev, hasPostedToday: true } : null);
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
      
      setUser(prev => prev ? { ...prev, anonymousCredits: newCredits } : null);
    }
    setShowAnonymousModal(false);
    toast({ title: "5 anonymous credits added!" });
  };

  if (!isBlocked) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 text-white max-w-md w-full rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-2">
              <Lock className="w-8 h-8 text-red-400 mr-2" />
              <h2 className="text-xl font-bold text-red-400">App Locked</h2>
            </div>
            <p className="text-gray-400">
              🔒 You haven't posted today — unlock the app by dropping your take
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="font-semibold text-purple-400">🔥 Today's Prompt</span>
              </div>
              {promptLoading ? (
                <div className="animate-pulse bg-gray-700 h-4 rounded"></div>
              ) : (
                <p className="text-gray-300">{prompt}</p>
              )}
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
              disabled={loading || !response.trim() || promptLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {loading ? 'Submitting...' : '🚀 Submit & Unlock App'}
            </Button>
            
            <p className="text-xs text-gray-400 text-center">
              You cannot access the app until you respond to today's prompt
            </p>
          </div>
        </div>
      </div>
      
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