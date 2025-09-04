import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import ProfileView from '@/components/ProfileView';
import LoadingSpinner from '@/components/LoadingSpinner';

const ProfileRoute: React.FC = () => {
  const { username } = useParams();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', String(username))
          .maybeSingle();
        if (!error && data?.id) setUserId(data.id);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  if (loading) return <LoadingSpinner />;
  if (!userId) return <Navigate to="/" replace />;

  return <ProfileView userId={userId} />;
};

export default ProfileRoute;


