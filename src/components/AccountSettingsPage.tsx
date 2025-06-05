import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const AccountSettingsPage: React.FC = () => {
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
    }, 1500);
  };

  return (
    <div className="max-w-lg mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
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
              <Button variant="outline">Cancel</Button>
              <Button onClick={handleSave} className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 mb-2">
                Save
              </Button>
            </div>
            <hr className="my-4" />
            <Button onClick={handleDeleteAccount} className="w-full bg-red-600 hover:bg-red-700" disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountSettingsPage; 