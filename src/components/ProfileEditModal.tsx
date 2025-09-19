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
    console.log('[ProfileEditModal] 📝 handleSubmit called', { 
      timestamp: new Date().toISOString(),
      userId: user?.id,
      formData: {
        username: formData.username,
        full_name: formData.full_name,
        bio: formData.bio,
        avatar_url: formData.avatar_url
      }
    });

    e.preventDefault();
    if (!user) {
      console.log('[ProfileEditModal] ❌ early return - no user');
      return;
    }

    console.log('[ProfileEditModal] ⏳ setting loading state to true');
    setLoading(true);
    
    try {
      console.log('[ProfileEditModal] 💾 updating profile in database', { 
        userId: user.id,
        table: 'profiles',
        updateData: {
          username: formData.username,
          full_name: formData.full_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url
        }
      });

      const dbUpdateStartTime = Date.now();
      const { error } = await supabase
        .from('profiles')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url
        })
        .eq('id', user.id);
      const dbUpdateDuration = Date.now() - dbUpdateStartTime;

      console.log('[ProfileEditModal] 📊 database update completed', { 
        duration: `${dbUpdateDuration}ms`,
        hasError: !!error,
        error: error
      });

      if (error) {
        console.error('[ProfileEditModal] ❌ database update error', { 
          error: error,
          errorMessage: error?.message,
          errorCode: error?.code
        });
        throw error;
      }

      console.log('[ProfileEditModal] ✅ database update successful');

      if (formData.email !== user.email) {
        console.log('[ProfileEditModal] 📧 email changed, updating auth user', { 
          oldEmail: user.email,
          newEmail: formData.email
        });

        const emailUpdateStartTime = Date.now();
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        });
        const emailUpdateDuration = Date.now() - emailUpdateStartTime;

        console.log('[ProfileEditModal] 📊 email update completed', { 
          duration: `${emailUpdateDuration}ms`,
          hasError: !!emailError,
          error: emailError
        });

        if (emailError) {
          console.error('[ProfileEditModal] ❌ email update error', { 
            error: emailError,
            errorMessage: emailError?.message
          });
          throw emailError;
        }

        console.log('[ProfileEditModal] ✅ email update successful - showing confirmation toast');
        toast({ 
          title: 'Email update initiated',
          description: 'Please check your new email for confirmation'
        });
      } else {
        console.log('[ProfileEditModal] ℹ️ email unchanged, skipping email update');
      }

      console.log('[ProfileEditModal] 📞 calling onUpdate callback with final profile data');
      const finalProfile = { ...profile, ...formData };
      console.log('[ProfileEditModal] 🔄 final profile object', { 
        originalProfile: profile,
        formData,
        finalProfile
      });

      onUpdate(finalProfile);
      console.log('[ProfileEditModal] ✅ onUpdate callback completed');

      console.log('[ProfileEditModal] 🎉 profile update successful - showing success toast');
      toast({ title: 'Profile updated successfully!' });
      
      console.log('[ProfileEditModal] 🚪 closing modal');
      onClose();
    } catch (error: unknown) {
      console.error('[ProfileEditModal] ❌ profile update failed', { 
        error: error,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

      console.log('[ProfileEditModal] 🚨 showing error toast to user');
      toast({ 
        title: 'Error updating profile',
        description: (error as Error).message,
        variant: 'destructive'
      });
    } finally {
      console.log('[ProfileEditModal] 🧹 setting loading state to false');
      setLoading(false);
      console.log('[ProfileEditModal] ✅ cleanup completed');
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
    console.log('[ProfileEditModal] 🖼️ handleImageUpdate called', { 
      timestamp: new Date().toISOString(),
      imageUrl,
      currentAvatarUrl: formData.avatar_url,
      profileId: profile?.id,
      username: profile?.username
    });

    console.log('[ProfileEditModal] 📝 updating formData with new avatar URL');
    setFormData(prev => {
      const newFormData = { ...prev, avatar_url: imageUrl };
      console.log('[ProfileEditModal] ✅ formData updated', { 
        previousAvatarUrl: prev.avatar_url,
        newAvatarUrl: imageUrl,
        formDataChanged: prev.avatar_url !== imageUrl
      });
      return newFormData;
    });

    // Immediately reflect in parent header so avatar updates without full submit
    console.log('[ProfileEditModal] 📞 calling onUpdate callback to update parent component');
    try { 
      const updatedProfile = { ...profile, avatar_url: imageUrl } as any;
      console.log('[ProfileEditModal] 🔄 creating updated profile object', { 
        originalProfile: profile,
        updatedProfile,
        avatarUrlChanged: profile?.avatar_url !== imageUrl
      });
      
      onUpdate(updatedProfile);
      console.log('[ProfileEditModal] ✅ onUpdate callback completed successfully');
    } catch (updateErr) {
      console.error('[ProfileEditModal] ❌ onUpdate callback failed', { 
        error: updateErr,
        errorMessage: updateErr instanceof Error ? updateErr.message : String(updateErr),
        imageUrl
      });
    }
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