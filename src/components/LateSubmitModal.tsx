import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useLateSubmission } from '@/hooks/useLateSubmission';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface LateSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: () => void;
  date: Date;
}

const LateSubmitModal: React.FC<LateSubmitModalProps> = ({ isOpen, onClose, onPurchase, date }) => {
  const { userCredits, setUserCredits, submitTake, user } = useAppContext();
  const { processLateSubmission, loading, error } = useLateSubmission();
  const { toast } = useToast();
  const [step, setStep] = useState<'initial' | 'processing' | 'compose' | 'success' | 'error'>('initial');
  const [composeContent, setComposeContent] = useState('');
  const [composeAnon, setComposeAnon] = useState(false);
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [datePrompt, setDatePrompt] = useState<string>('');
  const [promoCode, setPromoCode] = useState<string>('');

  // Prefetch prompt when opening or date changes
  useEffect(() => {
    if (isOpen) {
      loadPromptForDate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, date]);

  const handleLateSubmit = async () => {
    if (userCredits.late_submit > 0) {
      setStep('processing');
      try {
        // Use credit
        const { error: creditError } = await supabase
          .from('user_credits')
          .update({ balance: userCredits.late_submit - 1 })
          .eq('user_id', user.id)
          .eq('credit_type', 'late_submit');

        if (creditError) throw creditError;

        // Record credit history
        const { error: historyError } = await supabase
          .from('credit_history')
          .insert({
            user_id: user.id,
            credit_type: 'late_submit',
            amount: -1,
            action: 'use',
            created_at: new Date().toISOString()
          });

        if (historyError) {
          console.error('Error recording credit history:', historyError);
        }

        setUserCredits(prev => ({ ...prev, late_submit: prev.late_submit - 1 }));
        await loadPromptForDate();
        setStep('compose');
        onPurchase();
      } catch (err) {
        console.error('Error using late submit credit:', err);
        setStep('error');
        toast({ 
          title: "Error", 
          description: "Failed to use late submit credit. Please try again.",
          variant: "destructive" 
        });
      }
    } else {
      // Process payment
      setStep('processing');
      const success = await processLateSubmission(date.toISOString().split('T')[0], 1.99, promoCode?.trim().toUpperCase());
      if (success) {
        await loadPromptForDate();
        setStep('compose');
        onPurchase();
      } else {
        setStep('error');
      }
    }
  };

  const handleClose = () => {
    setStep('initial');
    setComposeContent('');
    setComposeAnon(false);
    setComposeError(null);
    onClose();
  };

  // Respectful close guard: do not allow closing while processing
  const handleRequestClose = () => {
    if (step === 'processing' || composeLoading) return; // ignore close
    handleClose();
  };

  const loadPromptForDate = async () => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('prompt_text')
        .eq('prompt_date', dateStr)
        .maybeSingle();
      if (error) {
        console.error('LateSubmitModal: prompt fetch error', error);
        setDatePrompt('');
      } else {
        setDatePrompt(data?.prompt_text || '');
      }
    } catch (e) {
      setDatePrompt('');
    }
  };

  const handleComposeSubmit = async () => {
    try {
      setComposeLoading(true);
      setComposeError(null);
      const trimmed = composeContent.trim();
      if (!trimmed) {
        setComposeError('Please enter your take first.');
        setComposeLoading(false);
        return;
      }
      const dateStr = date.toISOString().split('T')[0];
      const ok = await submitTake(trimmed, composeAnon, undefined, dateStr);
      if (!ok) {
        setComposeError('Failed to submit take.');
        setComposeLoading(false);
        return;
      }
      setStep('success');
    } catch (e: any) {
      setComposeError(e?.message || 'Failed to submit take');
    } finally {
      setComposeLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open)=>{ if (!open) handleRequestClose(); }}>
      <DialogContent 
        className="w-[calc(100vw-2rem)] max-w-md sm:max-w-lg md:max-w-xl max-h-[85dvh] overflow-y-auto rounded-xl"
        onInteractOutside={(e)=>{ if (step==='processing' || composeLoading) e.preventDefault(); }}
        onEscapeKeyDown={(e)=>{ if (step==='processing' || composeLoading) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle>Late submit for {date.toLocaleDateString()}</DialogTitle>
          <DialogDescription>
            {userCredits.late_submit > 0 
              ? `You have ${userCredits.late_submit} late submit credit${userCredits.late_submit > 1 ? 's' : ''} available.`
              : 'Unlock late submit to post your take and keep your streak.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 modal-scroll">
          {step === 'initial' && (
            <>
              <p className="text-sm text-brand-muted">
                {userCredits.late_submit > 0
                  ? 'Use a late submit credit to post your take and keep your streak.'
                  : 'Purchase a late submit credit to post your take and keep your streak.'}
              </p>
              {userCredits.late_submit <= 0 && (
                <div className="mt-3">
                  <label className="text-xs text-brand-muted block mb-1">Promo code (optional)</label>
                  <input value={promoCode} onChange={(e)=>setPromoCode(e.target.value)} placeholder="Enter promo (e.g., LINDSEY)" className="w-full p-2 rounded border-brand-border bg-brand-surface" />
                </div>
              )}
              <Button 
                onClick={handleLateSubmit}
                className="w-full btn-primary h-11 text-[clamp(14px,3.4vw,16px)] mt-3"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (userCredits.late_submit > 0 ? 'Processing…' : 'Starting checkout…') : (userCredits.late_submit > 0 ? 'Use Credit' : 'Purchase Credit ($1.99)')}
              </Button>
            </>
          )}

          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
              <p className="mt-2 text-sm text-brand-muted">
                {userCredits.late_submit > 0 ? 'Processing credit...' : 'Processing payment...'}
              </p>
            </div>
          )}

          {step === 'compose' && (
            <div className="space-y-4">
              <div className="p-3 rounded bg-brand-background text-sm text-brand-muted">
                <div className="font-semibold text-brand-text mb-1">Prompt for {date.toLocaleDateString()}</div>
                <div>{datePrompt || 'No prompt found for that day.'}</div>
              </div>
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={()=> setStep('initial')} disabled={composeLoading}>Back</Button>
                <span className="text-xs text-brand-muted">{composeContent.length}/2000</span>
              </div>
              <textarea
                className="w-full p-2 border rounded bg-brand-surface border-brand-border text-brand-text"
                placeholder="Write your take for this day..."
                value={composeContent}
                onChange={(e) => setComposeContent(e.target.value.slice(0, 2000))}
                rows={4}
                maxLength={2000}
              />
              <div className="flex items-center justify-between">
                <label className="text-sm text-brand-muted flex items-center gap-2">
                  <input type="checkbox" checked={composeAnon} onChange={(e) => setComposeAnon(e.target.checked)} />
                  Post anonymously
                </label>
                <div />
              </div>
              {composeError && (
                <div className="text-brand-danger text-sm">{composeError}</div>
              )}
              <div className="sticky bottom-0 bg-brand-surface/90 backdrop-blur supports-[backdrop-filter]:bg-brand-surface/70 py-3">
                <Button onClick={handleComposeSubmit} disabled={composeLoading || !composeContent.trim()} className="w-full h-11">
                  {composeLoading ? 'Submitting…' : 'Submit Take for This Date'}
                </Button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-4">
              <p className="text-sm text-brand-success">
                Take submitted for {date.toLocaleDateString()}!
              </p>
              <Button 
                onClick={handleClose}
                className="mt-4 w-full h-11"
              >
                Close
              </Button>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-4">
              <p className="text-sm text-brand-danger">
                {error || 'An error occurred. Please try again.'}
              </p>
              <Button 
                onClick={() => setStep('initial')}
                className="mt-4 w-full h-11"
              >
                Try Again
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LateSubmitModal; 