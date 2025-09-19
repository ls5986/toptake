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
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  console.log('[Avatar] 🔄 ProfileImageUpload render', {
    timestamp: new Date().toISOString(),
    currentImageUrl,
    username,
    uploading,
    hasFileInputRef: !!fileInputRef.current,
    userId: user?.id
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[Avatar] 🎯 handleFileSelect called', { 
      timestamp: new Date().toISOString(),
      eventType: event.type,
      targetFiles: event.target.files?.length || 0,
      target: event.target,
      files: event.target.files
    });

    const file = event.target.files?.[0];
    console.log('[Avatar] 📁 file extracted from event', { 
      file: file ? {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      } : null
    });

    if (!file || !user) {
      console.log('[Avatar] ❌ early return - missing file or user', { 
        hasFile: !!file, 
        hasUser: !!user,
        userId: user?.id 
      });
      return;
    }

    console.log('[Avatar] ✅ file and user validation passed', { 
      name: file.name, 
      size: file.size, 
      type: file.type,
      userId: user.id 
    });

    // File size validation
    const maxSize = 5 * 1024 * 1024;
    console.log('[Avatar] 📏 checking file size', { 
      fileSize: file.size, 
      maxSize, 
      isValid: file.size <= maxSize 
    });

    if (file.size > maxSize) {
      console.log('[Avatar] ❌ file too large', { 
        fileSize: file.size, 
        maxSize,
        sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
      });
      toast({
        title: 'File too large',
        description: 'Please select an image under 5MB',
        variant: 'destructive'
      });
      return;
    }

    // File type validation
    console.log('[Avatar] 🖼️ checking file type', { 
      mimeType: file.type, 
      isImage: file.type.startsWith('image/') 
    });

    if (!file.type.startsWith('image/')) {
      console.log('[Avatar] ❌ invalid file type', { 
        mimeType: file.type,
        expectedPrefix: 'image/'
      });
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    console.log('[Avatar] ✅ file validation passed, staging for confirmation');

    // Stage for confirmation
    try {
      console.log('[Avatar] 🧹 cleaning up existing preview URL', { 
        hasPreviewUrl: !!previewUrl 
      });
      try { 
        if (previewUrl) { 
          URL.revokeObjectURL(previewUrl); 
          console.log('[Avatar] ✅ previous preview URL revoked');
        } 
      } catch (e) {
        console.warn('[Avatar] ⚠️ failed to revoke previous preview URL', e);
      }

      console.log('[Avatar] 🔗 creating object URL for preview');
      const localUrl = URL.createObjectURL(file);
      console.log('[Avatar] ✅ object URL created', { localUrl });

      console.log('[Avatar] 📝 setting pending file and preview URL');
      setPendingFile(file);
      setPreviewUrl(localUrl);
      console.log('[Avatar] ✅ file staged for confirmation - ready for user to confirm upload');
      
    } catch (e) {
      console.error('[Avatar] ❌ failed to stage preview', { 
        error: e,
        errorMessage: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined
      });
    }
  };

  const doUpload = async (file: File) => {
    console.log('[Avatar] 🚀 doUpload started', { 
      timestamp: new Date().toISOString(),
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId: user?.id
    });

    setUploading(true);
    console.log('[Avatar] 📤 uploading state set to true');

    try {
      console.log('[Avatar] 🔧 processing file name and extension');
      const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_');
      console.log('[Avatar] 📝 safe name created', { 
        originalName: file.name, 
        safeName 
      });

      const fileExt = (safeName.split('.').pop() || 'jpg').toLowerCase();
      console.log('[Avatar] 📄 file extension extracted', { 
        fileExt,
        fallbackUsed: !safeName.includes('.')
      });

      const allowed = ['jpg','jpeg','png','webp','gif'];
      console.log('[Avatar] ✅ checking file extension against allowed types', { 
        fileExt, 
        allowed, 
        isValid: allowed.includes(fileExt) 
      });

      if (!allowed.includes(fileExt)) {
        console.log('[Avatar] ❌ unsupported file extension', { 
          fileExt, 
          allowed 
        });
        throw new Error(`Unsupported file type .${fileExt}. Allowed: ${allowed.join(', ')}`);
      }

      const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
      console.log('[Avatar] 📁 file path generated', { 
        fileName, 
        filePath,
        userId: user.id,
        timestamp: Date.now()
      });

      console.log('[Avatar] ☁️ starting upload to Supabase storage', { 
        path: filePath, 
        bucket: 'avatars',
        fileSize: file.size,
        contentType: file.type || `image/${fileExt}`,
        upsert: true,
        cacheControl: '3600'
      });

      const uploadStartTime = Date.now();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type || `image/${fileExt}`,
          cacheControl: '3600'
        });
      const uploadDuration = Date.now() - uploadStartTime;

      console.log('[Avatar] 📊 upload operation completed', { 
        duration: `${uploadDuration}ms`,
        hasError: !!uploadError,
        error: uploadError
      });

      if (uploadError) {
        console.error('[Avatar] ❌ upload error details', { 
          error: uploadError,
          errorMessage: uploadError?.message,
          errorCode: uploadError?.statusCode,
          errorDetails: uploadError
        });
        
        const msg = uploadError?.message || String(uploadError);
        console.log('[Avatar] 🔍 analyzing error message', { 
          message: msg,
          isPayloadTooLarge: /payload too large|413/i.test(msg)
        });

        // Surface common issues clearly
        if (/payload too large|413/i.test(msg)) {
          console.log('[Avatar] ❌ payload too large error detected');
          throw new Error('Upload failed: image too large. Please choose an image under 5MB.');
        }
        throw new Error(`Upload failed: ${msg}`);
      }

      console.log('[Avatar] ✅ upload successful, getting public URL');
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      console.log('[Avatar] 🔗 public URL generated', { 
        publicUrl,
        filePath,
        bucket: 'avatars'
      });

      // Verify reachability; use GET Range to dodge HEAD/CORS quirks
      console.log('[Avatar] 🔍 verifying public URL reachability');
      try {
        const probeUrl = `${publicUrl}?t=${Date.now()}`;
        console.log('[Avatar] 🌐 making probe request', { 
          probeUrl,
          method: 'GET',
          headers: { Range: 'bytes=0-0' },
          cache: 'no-store'
        });

        const probeStartTime = Date.now();
        const probe = await fetch(probeUrl, { 
          method: 'GET', 
          headers: { Range: 'bytes=0-0' }, 
          cache: 'no-store' 
        });
        const probeDuration = Date.now() - probeStartTime;

        console.log('[Avatar] 📡 probe response received', { 
          status: probe.status,
          statusText: probe.statusText,
          ok: probe.ok,
          duration: `${probeDuration}ms`,
          headers: Object.fromEntries(probe.headers.entries())
        });

        if (!probe.ok) {
          console.error('[Avatar] ❌ public URL not reachable', { 
            status: probe.status,
            statusText: probe.statusText,
            url: probeUrl
          });
          throw new Error(`Public URL not reachable (HTTP ${probe.status}). Check Storage → Bucket 'avatars' policies (public read).`);
        }

        console.log('[Avatar] ✅ public URL verification successful');
      } catch (netErr: any) {
        console.warn('[Avatar] ⚠️ probe failed - continuing anyway', { 
          error: netErr,
          errorMessage: netErr?.message,
          errorType: netErr?.name
        });
        // Continue but warn; user may still see due to CDN delay
      }

      console.log('[Avatar] 💾 updating profile row in database', { 
        userId: user.id,
        avatarUrl: publicUrl,
        table: 'profiles'
      });

      const dbUpdateStartTime = Date.now();
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      const dbUpdateDuration = Date.now() - dbUpdateStartTime;

      console.log('[Avatar] 📊 database update operation completed', { 
        duration: `${dbUpdateDuration}ms`,
        hasError: !!updateError,
        error: updateError
      });

      if (updateError) {
        console.error('[Avatar] ❌ profile update error details', { 
          error: updateError,
          errorMessage: updateError?.message,
          errorCode: updateError?.code,
          errorDetails: updateError,
          userId: user.id,
          avatarUrl: publicUrl
        });
        throw new Error(`Saved to storage but failed to update profile: ${updateError.message}`);
      }

      console.log('[Avatar] ✅ profile database update successful');

      const cacheBusted = `${publicUrl}?t=${Date.now()}`;
      console.log('[Avatar] 🔄 creating cache-busted URL and calling onImageUpdate', { 
        originalUrl: publicUrl,
        cacheBustedUrl: cacheBusted,
        timestamp: Date.now()
      });

      console.log('[Avatar] 📞 calling onImageUpdate callback');
      onImageUpdate(cacheBusted);
      console.log('[Avatar] ✅ onImageUpdate callback completed');

      // Read‑back verification: fetch profile to ensure value persisted
      console.log('[Avatar] 🔍 starting read-back verification');
      try {
        console.log('[Avatar] 📖 fetching profile from database for verification', { 
          userId: user.id,
          table: 'profiles'
        });

        const verifyStartTime = Date.now();
        const { data: verify } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        const verifyDuration = Date.now() - verifyStartTime;

        console.log('[Avatar] 📊 verification query completed', { 
          duration: `${verifyDuration}ms`,
          hasData: !!verify,
          avatarUrl: verify?.avatar_url,
          fullProfile: verify
        });

        console.log('[Avatar] ✅ verification successful - avatar_url persisted', { 
          avatarUrl: verify?.avatar_url,
          matchesExpected: verify?.avatar_url === publicUrl
        });

        // Update localStorage and dispatch event
        console.log('[Avatar] 💾 updating localStorage and dispatching event');
        try {
          const profileData = verify || {};
          console.log('[Avatar] 📝 storing profile in localStorage', { 
            key: `profile:${user.id}`,
            data: profileData
          });
          
          localStorage.setItem(`profile:${user.id}`, JSON.stringify(profileData));
          console.log('[Avatar] ✅ localStorage updated successfully');

          console.log('[Avatar] 📡 dispatching profile:updated event', { 
            eventType: 'profile:updated',
            detail: { avatar_url: verify?.avatar_url }
          });
          
          window.dispatchEvent(new CustomEvent('profile:updated', { 
            detail: { avatar_url: verify?.avatar_url } 
          }));
          console.log('[Avatar] ✅ event dispatched successfully');

        } catch (storageErr) {
          console.warn('[Avatar] ⚠️ localStorage or event dispatch failed', { 
            error: storageErr,
            errorMessage: storageErr instanceof Error ? storageErr.message : String(storageErr)
          });
        }

      } catch (verifyErr) { 
        console.warn('[Avatar] ⚠️ verify readback failed', { 
          error: verifyErr,
          errorMessage: verifyErr instanceof Error ? verifyErr.message : String(verifyErr),
          stack: verifyErr instanceof Error ? verifyErr.stack : undefined
        }); 
      }

      console.log('[Avatar] 🎉 upload process completed successfully - showing success toast');
      toast({ title: 'Profile picture updated successfully!' });
    } catch (error: any) {
      console.error('[Avatar] ❌ upload process failed', { 
        error: error,
        errorMessage: error?.message,
        errorStack: error?.stack,
        errorType: error?.name,
        timestamp: new Date().toISOString()
      });

      const hint = [
        'Troubleshooting:',
        '1) Supabase Storage → ensure bucket "avatars" exists and is public read',
        '2) Policies include public SELECT and authenticated write',
        '3) Vercel/Supabase CORS allows your site URL',
        '4) Try a smaller JPG/PNG (<5MB)'
      ].join('\n');
      const description = `${error?.message || 'Unknown error'}\n\n${hint}`;
      
      console.log('[Avatar] 🚨 showing error toast to user', { 
        title: 'Error uploading image',
        description: description.substring(0, 200) + '...', // Truncate for logging
        variant: 'destructive'
      });
      
      toast({ title: 'Error uploading image', description, variant: 'destructive' });
    } finally {
      console.log('[Avatar] 🧹 starting cleanup process');
      
      console.log('[Avatar] 📤 setting uploading state to false');
      setUploading(false);
      
      console.log('[Avatar] 🗑️ clearing pending file');
      setPendingFile(null);
      
      console.log('[Avatar] 🔗 revoking preview URL', { hasPreviewUrl: !!previewUrl });
      try { 
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
          console.log('[Avatar] ✅ preview URL revoked successfully');
        } else {
          console.log('[Avatar] ℹ️ no preview URL to revoke');
        }
      } catch (revokeErr) {
        console.warn('[Avatar] ⚠️ failed to revoke preview URL', { 
          error: revokeErr,
          errorMessage: revokeErr instanceof Error ? revokeErr.message : String(revokeErr)
        });
      }
      
      console.log('[Avatar] 🧽 clearing preview URL state');
      setPreviewUrl(null);
      
      console.log('[Avatar] ✅ cleanup completed');
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <Avatar className="w-24 h-24">
          {previewUrl ? (
            <AvatarImage src={previewUrl} alt={username} />
          ) : currentImageUrl ? (
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
        onClick={() => {
          console.log('[Avatar] 📷 camera button clicked', { 
            timestamp: new Date().toISOString(),
            uploading,
            hasFileInput: !!fileInputRef.current,
            fileInputElement: fileInputRef.current,
            currentImageUrl,
            username
          });
          console.log('[Avatar] 🖱️ about to trigger file input click');
          fileInputRef.current?.click();
          console.log('[Avatar] ✅ file input click triggered');
        }}
        disabled={uploading}
      >
          {uploading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white border-brand-accent" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      {!pendingFile ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => { 
            console.log('[Avatar] 📤 change photo button clicked', { 
              timestamp: new Date().toISOString(),
              uploading,
              hasFileInput: !!fileInputRef.current
            }); 
            fileInputRef.current?.click(); 
          }}
          disabled={uploading}
          className="border-brand-accent text-brand-accent hover:bg-brand-surface"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? 'Uploading...' : 'Change Photo'}
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button
            onClick={() => { 
              console.log('[Avatar] ✅ confirm upload button clicked', { 
                timestamp: new Date().toISOString(),
                hasPendingFile: !!pendingFile,
                uploading,
                pendingFileName: pendingFile?.name
              }); 
              if (pendingFile) doUpload(pendingFile); 
            }}
            disabled={uploading}
            className="bg-brand-accent hover:bg-brand-primary"
          >
            {uploading ? 'Uploading...' : 'Confirm'}
          </Button>
          <Button
            variant="outline"
            onClick={() => { 
              console.log('[Avatar] ❌ cancel upload button clicked', { 
                timestamp: new Date().toISOString(),
                hasPreviewUrl: !!previewUrl,
                hasPendingFile: !!pendingFile,
                uploading
              }); 
              try { 
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                  console.log('[Avatar] 🧹 preview URL revoked on cancel');
                }
              } catch (e) {
                console.warn('[Avatar] ⚠️ failed to revoke preview URL on cancel', e);
              }
              setPendingFile(null); 
              setPreviewUrl(null);
              console.log('[Avatar] ✅ upload cancelled - state cleared');
            }}
            disabled={uploading}
          >
            Cancel
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        onClick={() => {
          console.log('[Avatar] 🖱️ file input clicked', { 
            timestamp: new Date().toISOString(),
            hasRef: !!fileInputRef.current
          });
        }}
      />
    </div>
  );
};

export default ProfileImageUpload;