import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface EmailVerificationModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
  onContinue: () => void;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  isOpen,
  email,
  onClose,
  onContinue
}) => {
  const [resending, setResending] = useState(false);
  const { toast } = useToast();

  const handleResendEmail = async () => {
    if (!email) {
      toast({ title: 'No email address found', variant: 'destructive' });
      return;
    }

    setResending(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) {
        console.error('Resend error:', error);
        let errorMessage = 'Failed to resend verification email';
        
        if (error.message.includes('rate limit')) {
          errorMessage = 'Please wait before requesting another email';
        } else if (error.message.includes('already confirmed')) {
          errorMessage = 'Email is already verified';
        }
        
        toast({ 
          title: 'Resend Failed', 
          description: errorMessage,
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Email Sent!', 
          description: 'Please check your inbox for the verification link.' 
        });
      }
    } catch (error) {
      console.error('Resend error:', error);
      toast({ 
        title: 'Resend Failed', 
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive' 
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            Check Your Email
          </DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-4 py-4">
          <div className="flex justify-center">
            <Mail className="h-16 w-16 text-purple-400" />
          </div>
          <p className="text-gray-300">
            We've sent a verification email to:
          </p>
          <p className="font-semibold text-purple-400 break-all">
            {email}
          </p>
          <p className="text-sm text-gray-400">
            Please check your email and click the verification link to continue.
          </p>
          <p className="text-xs text-gray-500">
            Don't forget to check your spam folder!
          </p>
          <div className="space-y-2 pt-4">
            <Button 
              onClick={onContinue}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              I've Verified My Email
            </Button>
            <Button 
              onClick={handleResendEmail}
              disabled={resending}
              variant="outline"
              className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              {resending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>
            <Button 
              onClick={onClose}
              variant="ghost"
              className="w-full text-gray-400 hover:text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailVerificationModal;