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
import { format } from 'date-fns';

interface AppBlockerProps {
  isBlocked: boolean;
  onSubmit: () => void;
  message?: string;
  targetDate?: Date; // Add target date for late submissions
}

export const AppBlocker = ({ isBlocked, onSubmit, message, targetDate }: AppBlockerProps) => {
  console.log('AppBlocker render!');
  const { user, updateStreak, setUser, submitTake, hasPostedToday } = useAppContext();
  const { userCredits = { anonymous: 0, late_submit: 0, sneak_peek: 0, boost: 0, extra_takes: 0, delete: 0 } } = useCredits();
  const [response, setResponse] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const [takes, setTakes] = useState<any[]>([]);
  const [loadingTakes, setLoadingTakes] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Determine which date to use - targetDate for late submissions, today for normal
  const effectiveDate = targetDate || new Date();
  const isLateSubmission = !!targetDate;

  // Prompt state - use targetDate if provided, otherwise today
  const { prompt, loading: promptLoading, error: promptError } = useTodayPrompt(effectiveDate);

  const canPostAnonymously = user && (userCredits?.anonymous ?? 0) > 0;

  // Fetch takes for the target date (for late submissions)
  const fetchTakesForDate = async (date: Date) => {
    if (!isLateSubmission) return;
    
    setLoadingTakes(true);
    try {
      const dateStr = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('takes')
        .select(`
          *,
          profiles:user_id(username)
        `)
        .eq('prompt_date', dateStr)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedTakes = (data || []).map((take: any) => ({
        id: take.id,
        content: take.content,
        username: take.is_anonymous ? 'Anonymous' : take.profiles?.username || 'Unknown',
        timestamp: take.created_at,
        isAnonymous: take.is_anonymous
      }));

      setTakes(formattedTakes);
    } catch (error) {
      console.error('Error fetching takes for date:', error);
    } finally {
      setLoadingTakes(false);
    }
  };

  // Fetch takes when targetDate changes
  useEffect(() => {
    if (isLateSubmission && effectiveDate) {
      fetchTakesForDate(effectiveDate);
    }
  }, [targetDate, isLateSubmission]);

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
      // Only redirect on success and notify parent
      onSubmit();
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

  // No late-submit forced date handling here; the modal manages that flow

  // Don't render if user has already posted today
  if (hasPostedToday) return null;
  
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
                  <span className="font-semibold text-brand-accent">
                    {isLateSubmission ? `${format(effectiveDate, 'MMM dd, yyyy')} Prompt` : "Today's Prompt"}
                  </span>
                </div>
                {promptLoading ? (
                  <div className="animate-pulse bg-brand-muted h-4 rounded"></div>
                ) : (
                  <p className="text-brand-muted">{prompt.prompt_text}</p>
                )}
              </div>

              {/* Show takes for the target date in late submission mode */}
              {isLateSubmission && (
                <div className="bg-brand-surface p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-brand-accent">
                      Takes from {format(effectiveDate, 'MMM dd, yyyy')}
                    </span>
                    <span className="text-sm text-brand-muted">
                      {takes.length} takes
                    </span>
                  </div>
                  
                  {loadingTakes ? (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="animate-pulse bg-brand-muted h-16 rounded"></div>
                      ))}
                    </div>
                  ) : takes.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {takes.map((take) => (
                        <div key={take.id} className="p-3 bg-brand-background rounded border border-brand-border">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-brand-text mb-1">{take.content}</p>
                              <div className="flex items-center text-xs text-brand-muted">
                                <span>{take.username}</span>
                                <span className="mx-2">•</span>
                                <span>{format(new Date(take.timestamp), 'h:mm a')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-brand-muted text-center py-4">No takes yet for this date</p>
                  )}
                </div>
              )}
              
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