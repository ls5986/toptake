import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { MonetizationModals } from './MonetizationModals';
import { useTodayPrompt } from '@/hooks/useTodayPrompt';

interface DailyPromptBlockerProps {
  isBlocked: boolean;
  onSubmit: () => void;
}

export const DailyPromptBlocker = ({ isBlocked, onSubmit }: DailyPromptBlockerProps) => {
  const { user, submitTake, userCredits, hasPostedToday } = useAppContext();
  const [response, setResponse] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const { toast } = useToast();
  const { prompt, loading: promptLoading, error } = useTodayPrompt();

  const canPostAnonymously = user && userCredits.anonymous > 0;

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
      // Use the context submitTake function instead of duplicating logic
      const success = await submitTake(trimmedContent, isAnonymous, prompt?.id);
      
      if (success) {
        onSubmit(); // This will trigger re-render
      } else {
        toast({ 
          title: "Failed to submit", 
          description: "Please try again", 
          variant: "destructive" 
        });
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast({ 
        title: "An error occurred", 
        variant: "destructive" 
      });
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
            <DialogDescription>
              Submit your take to unlock the app. You must respond to today's prompt before accessing other features.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-brand-surface rounded-lg">
              <p className="text-brand-text">{prompt?.prompt_text}</p>
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
              className="w-full btn-primary"
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