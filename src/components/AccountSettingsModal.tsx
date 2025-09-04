import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAppContext } from '@/contexts/AppContext';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const { user, logout } = useAppContext();
  const [confirmText, setConfirmText] = useState('');

  // Load current user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setUsername(user.username || '');
      setFullName(user.full_name || '');
    }
  }, [isOpen, user]);

  const handleSave = async () => {
    if (!user?.id) {
      toast({ title: 'Error', description: 'User not found', variant: 'destructive' });
      return;
    }

    if (!username.trim()) {
      toast({ title: 'Error', description: 'Username is required', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      
      // Update profile in Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          username: username.trim(),
          full_name: fullName.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      
      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }
      
      toast({ 
        title: 'Success', 
        description: 'Profile updated successfully' 
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to update profile', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) {
      toast({ title: 'Error', description: 'User not found', variant: 'destructive' });
      return;
    }

    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data.')) {
      return;
    }

    try {
      setDeleting(true);
      
      // Delete user data from all tables first
      const tablesToClean = ['takes', 'user_credits', 'purchases', 'profiles'];
      
      for (const table of tablesToClean) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('user_id', user.id);
        
        if (error) {
          console.warn(`Warning: Could not clean ${table}:`, error);
        }
      }
      
      // Delete the user account from Supabase Auth
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error('Error deleting user from auth:', deleteError);
        // Even if auth deletion fails, we've cleaned the data
        toast({ 
          title: 'Warning', 
          description: 'Account data deleted but auth cleanup failed. Please contact support.', 
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Success', 
          description: 'Account deleted successfully' 
        });
      }
      
      // Logout and redirect
      logout();
      onClose();
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete account', 
        variant: 'destructive' 
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            disabled={loading}
          />
          <Input
            placeholder="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            disabled={loading}
          />
          <Input
            type="password"
            placeholder="New Password (coming soon)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={true}
            className="opacity-50"
          />
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={onClose} disabled={loading || deleting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="w-full btn-primary mb-2"
              disabled={loading || deleting}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <hr className="my-4" />
          <div className="space-y-2 p-3 rounded-md border border-red-700/40 bg-red-900/10">
            <div className="text-sm font-semibold text-red-400">Danger Zone</div>
            <div className="text-xs text-red-300">Type DELETE to enable account deletion</div>
            <Input
              placeholder="Type DELETE"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              disabled={deleting || loading}
            />
            <Button 
              onClick={handleDeleteAccount} 
              className="w-full bg-red-600 hover:bg-red-700" 
              disabled={deleting || loading || confirmText !== 'DELETE'}
            >
              {deleting ? 'Deleting Account...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSettingsModal; 