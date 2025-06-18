import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { useLateSubmission } from '@/hooks/useLateSubmission';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface LateSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: () => void;
  date: Date;
}

const LateSubmitModal: React.FC<LateSubmitModalProps> = ({ isOpen, onClose, onPurchase, date }) => {
  const { userCredits, setUserCredits } = useAppContext();
  const { processLateSubmission, loading, error } = useLateSubmission();
  const { toast } = useToast();
  const [step, setStep] = useState<'initial' | 'processing' | 'success' | 'error'>('initial');

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
        setStep('success');
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
      const success = await processLateSubmission(date.toISOString().split('T')[0], 1.99);
      if (success) {
        setStep('success');
        onPurchase();
      } else {
        setStep('error');
      }
    }
  };

  const handleClose = () => {
    setStep('initial');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Missed Prompt?</DialogTitle>
          <DialogDescription>
            You didn't submit a take for {date.toLocaleDateString()}. 
            {userCredits.late_submit > 0 
              ? ` You have ${userCredits.late_submit} late submit credit${userCredits.late_submit > 1 ? 's' : ''} available.`
              : ' Unlock late submit to post your take and keep your streak!'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'initial' && (
            <>
              <p className="text-sm text-brand-muted">
                {userCredits.late_submit > 0
                  ? 'Use a late submit credit to post your take and keep your streak.'
                  : 'Purchase a late submit credit to post your take and keep your streak.'}
              </p>
              <Button 
                onClick={handleLateSubmit}
                className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
              >
                {userCredits.late_submit > 0 ? 'Use Credit' : 'Purchase Credit ($1.99)'}
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

          {step === 'success' && (
            <div className="text-center py-4">
              <p className="text-sm text-brand-success">
                {userCredits.late_submit > 0 
                  ? 'Credit used successfully! You can now submit your take.'
                  : 'Payment successful! You can now submit your take.'}
              </p>
              <Button 
                onClick={handleClose}
                className="mt-4 w-full"
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
                className="mt-4 w-full"
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