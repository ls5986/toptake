import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async () => {
    if (!password || password.length < 6) {
      toast({ title: 'Password too short', description: 'Use at least 6 characters', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords don't match", variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: 'Password updated', description: 'You are now signed in.' });
      onSuccess?.();
      onClose();
      setPassword('');
      setConfirm('');
    } catch (err: any) {
      toast({ title: 'Failed to update password', description: err?.message || 'Try again', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-brand-surface border-brand-border text-brand-text max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">Reset your password</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text"
              onClick={() => setShowPassword(v => !v)}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="relative">
            <Input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Confirm new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text"
              onClick={() => setShowConfirm(v => !v)}
            >
              {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-brand-accent hover:bg-brand-primary">
            {loading ? 'Updating...' : 'Update password'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResetPasswordModal;


