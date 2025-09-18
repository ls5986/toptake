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

    console.log('[Avatar] selected', { name: file.name, size: file.size, type: file.type });

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
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
      const fileExt = (safeName.split('.').pop() || 'jpg').toLowerCase();
      const allowed = ['jpg','jpeg','png','webp','gif'];
      if (!allowed.includes(fileExt)) {
        throw new Error(`Unsupported file type .${fileExt}. Allowed: ${allowed.join(', ')}`);
      }

      const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('[Avatar] uploading to storage', { path: filePath, bucket: 'avatars' });
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || `image/${fileExt}`,
          cacheControl: '3600'
        });
      if (uploadError) {
        console.error('[Avatar] upload error raw', uploadError);
        const msg = uploadError?.message || String(uploadError);
        // Surface common issues clearly
        if (/payload too large|413/i.test(msg)) {
          throw new Error('Upload failed: image too large. Please choose an image under 5MB.');
        }
        throw new Error(`Upload failed: ${msg}`);
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      console.log('[Avatar] publicUrl', publicUrl);

      // Verify reachability; use GET Range to dodge HEAD/CORS quirks
      try {
        const probe = await fetch(`${publicUrl}?t=${Date.now()}`, { method: 'GET', headers: { Range: 'bytes=0-0' }, cache: 'no-store' });
        if (!probe.ok) {
          throw new Error(`Public URL not reachable (HTTP ${probe.status}). Check Storage → Bucket 'avatars' policies (public read).`);
        }
      } catch (netErr: any) {
        console.warn('[Avatar] probe failed', netErr);
        // Continue but warn; user may still see due to CDN delay
      }

      console.log('[Avatar] updating profile row');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) {
        console.error('[Avatar] profile update error raw', updateError);
        throw new Error(`Saved to storage but failed to update profile: ${updateError.message}`);
      }

      const cacheBusted = `${publicUrl}?t=${Date.now()}`;
      onImageUpdate(cacheBusted);

      // Read‑back verification: fetch profile to ensure value persisted
      try {
        const { data: verify } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        console.log('[Avatar] verify avatar_url', verify?.avatar_url);
      } catch (verifyErr) { console.warn('[Avatar] verify readback failed', verifyErr); }

      toast({ title: 'Profile picture updated successfully!' });
    } catch (error: any) {
      const hint = [
        'Troubleshooting:',
        '1) Supabase Storage → ensure bucket "avatars" exists and is public read',
        '2) Policies include public SELECT and authenticated write',
        '3) Vercel/Supabase CORS allows your site URL',
        '4) Try a smaller JPG/PNG (<5MB)'
      ].join('\n');
      const description = `${error?.message || 'Unknown error'}\n\n${hint}`;
      console.error('[Avatar] upload error', error);
      toast({ title: 'Error uploading image', description, variant: 'destructive' });
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