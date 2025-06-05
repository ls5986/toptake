import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';

interface ProfileImageUploadProps {
  currentImageUrl?: string;
  username: string;
  onImageUpdate: (imageUrl: string) => void;
}

const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({
  currentImageUrl,
  username,
  onImageUpdate
}) => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB',
        variant: 'destructive'
      });
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onImageUpdate(publicUrl);
      toast({ title: 'Profile picture updated successfully!' });
    } catch (error: any) {
      let description = error.message;
      if (description && description.toLowerCase().includes('bucket')) {
        description += ' (Check that the avatars storage bucket exists in Supabase)';
      }
      toast({
        title: 'Error uploading image',
        description,
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="w-24 h-24">
          {currentImageUrl ? (
            <AvatarImage src={currentImageUrl} alt={username} />
          ) : (
            <AvatarFallback className="bg-brand-accent text-brand-text text-2xl">
              {username[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          )}
        </Avatar>
        <Button
          size="sm"
          className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0 bg-brand-accent hover:bg-brand-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white border-brand-accent" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="border-brand-accent text-brand-accent hover:bg-brand-surface"
      >
        <Upload className="w-4 h-4 mr-2" />
        {uploading ? 'Uploading...' : 'Change Photo'}
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ProfileImageUpload;