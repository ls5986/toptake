import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ProfileImageUpload from './ProfileImageUpload';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';

// Define a Profile type for this modal
interface Profile {
  id: string;
  username: string;
  full_name?: string;
  bio?: string;
  email?: string;
  avatar_url?: string;
}

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onUpdate: (updatedProfile: Profile) => void;
}

const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdate
}) => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: profile?.username || '',
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    email: user?.email || '',
    avatar_url: profile?.avatar_url || ''
  });
  const initial = {
    username: profile?.username || '',
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    email: user?.email || '',
    avatar_url: profile?.avatar_url || ''
  };
  const dirty = (
    formData.username !== initial.username ||
    formData.full_name !== initial.full_name ||
    formData.bio !== initial.bio ||
    formData.email !== initial.email ||
    formData.avatar_url !== initial.avatar_url
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url
        })
        .eq('id', user.id);

      if (error) throw error;

      if (formData.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });
        if (emailError) throw emailError;
        toast({ 
          title: 'Email update initiated',
          description: 'Please check your new email for confirmation'
        });
      }

      onUpdate({ ...profile, ...formData });
      toast({ title: 'Profile updated successfully!' });
      onClose();
    } catch (error: unknown) {
      toast({ 
        title: 'Error updating profile',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email);
      if (error) throw error;
      
      toast({ title: 'Password reset email sent!' });
    } catch (error: unknown) {
      toast({ 
        title: 'Error sending reset email',
        description: (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  const handleImageUpdate = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, avatar_url: imageUrl }));
    // Immediately reflect in parent header so avatar updates without full submit
    try { onUpdate({ ...profile, avatar_url: imageUrl } as any); } catch {}
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-brand-surface border-brand-border text-brand-text max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <ProfileImageUpload
            currentImageUrl={formData.avatar_url}
            username={formData.username}
            onImageUpdate={handleImageUpdate}
          />

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              className="bg-brand-surface border-brand-border text-brand-text"
              required
            />
          </div>

          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="bg-brand-surface border-brand-border text-brand-text"
            />
          </div>

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              className="bg-brand-surface border-brand-border text-brand-text"
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="bg-brand-surface border-brand-border text-brand-text"
              required
            />
          </div>

          <div className="flex flex-col space-y-2">
            <Button type="submit" disabled={loading || !dirty} className="bg-brand-accent hover:bg-brand-primary">
              {loading ? 'Updating...' : (dirty ? 'Update Profile' : 'No changes')}
            </Button>
            
            <Button 
              type="button" 
              onClick={handleResetPassword}
              className="btn-secondary"
            >
              Reset Password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileEditModal;