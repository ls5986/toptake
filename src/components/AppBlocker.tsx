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
import { useCredits } from '@/lib/credits';
import { MonetizationModals } from './MonetizationModals';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { useTodayPrompt } from '@/hooks/useTodayPrompt';

interface AppBlockerProps {
  isBlocked: boolean;
  onSubmit: () => void;
  message?: string;
}

export const AppBlocker = ({ isBlocked, onSubmit, message }: AppBlockerProps) => {
  console.log('AppBlocker render!');
  const { user, updateStreak, setUser, submitTake } = useAppContext();
  const { userCredits = { anonymous: 0, late_submit: 0, sneak_peek: 0, boost: 0, extra_takes: 0, delete: 0 } } = useCredits();
  const [response, setResponse] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Prompt state
  const { prompt, loading: promptLoading, error: promptError, hasPostedToday } = useTodayPrompt();

  const canPostAnonymously = user && (userCredits?.anonymous ?? 0) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('AppBlocker handleSubmit CALLED');
    e.preventDefault(); // Prevent default form submission
    setLoading(true);
    setError(null);
    try {
      console.log('handleSubmit: response value:', response);
      if (!response.trim()) {
        setError('Please enter your take before submitting.');
        setLoading(false);
        return;
      }
      console.log('Starting take submission...');
      const success = await submitTake(response, isAnonymous, prompt.id);
      console.log('Take submission result:', success);
      if (!success) {
        setError('Failed to submit take. Please try again.');
        setLoading(false);
        return;
      }
      // Only redirect on success
      navigate('/');
    } catch (err) {
      console.error('Error submitting take:', err);
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Only allow closing if not loading
    if (!loading) {
      navigate('/');
    }
  };

  // Add escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isBlocked && !loading) {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isBlocked, loading]);

  // Log button state before rendering
  console.log('AppBlocker render state:', {
    responseTrim: response.trim(),
    loading,
    buttonDisabled: loading || !response.trim()
  });

  if (!isBlocked) return null;

  return (
    <>
      <Dialog open={isBlocked} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px] p-0 bg-brand-surface border-brand-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <DialogHeader>
              <DialogTitle className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Lock className="w-8 h-8 text-brand-danger mr-2" />
                  <h2 className="text-xl font-bold text-brand-danger">App Locked</h2>
                </div>
              </DialogTitle>
              <DialogDescription className="text-brand-muted text-center">
                You haven't posted today — unlock the app by dropping your take
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="bg-brand-surface p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <span className="font-semibold text-brand-accent">Today's Prompt</span>
                </div>
                {promptLoading ? (
                  <div className="animate-pulse bg-brand-muted h-4 rounded"></div>
                ) : (
                  <p className="text-brand-muted">{prompt.prompt_text}</p>
                )}
              </div>
              
              <div className="relative">
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value.slice(0, 280))}
                  placeholder="Share your take... (280 characters max)"
                  className="min-h-24 resize-none"
                  maxLength={280}
                  disabled={loading}
                />
                <div className="text-right text-brand-muted text-sm">
                  {response.length}/280
                </div>
              </div>
              
              {error && (
                <div className="text-red-500 text-sm mt-2">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isAnonymous}
                    onCheckedChange={setIsAnonymous}
                    disabled={!canPostAnonymously}
                  />
                  <span className="text-sm text-brand-muted">Post anonymously</span>
                </div>
                <Badge variant="outline" className="text-brand-accent border-brand-accent">
                  {userCredits?.anonymous ?? 0} left
                </Badge>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 px-6 pb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={loading || !response.trim()}
              >
                {loading ? 'Submitting...' : 'Submit Take'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      
      {showAnonymousModal && (
        <MonetizationModals
          onClose={() => setShowAnonymousModal(false)}
          onSuccess={() => {
            setShowAnonymousModal(false);
            // Refresh credits after purchase
            window.location.reload();
          }}
        />
      )}
    </>
  );
};