import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    // TODO: Replace with real Supabase update logic
    alert('Profile updated (placeholder)');
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    // TODO: Replace with real Supabase delete logic
    setTimeout(() => {
      alert('Account deleted (placeholder)');
      setDeleting(false);
      onClose();
    }, 1500);
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
          />
          <Input
            placeholder="Full Name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
          />
          <Input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <div className="flex justify-between mt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 mb-2">
              Save
            </Button>
          </div>
          <hr className="my-4" />
          <Button onClick={handleDeleteAccount} className="w-full bg-red-600 hover:bg-red-700" disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete Account'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSettingsModal; 