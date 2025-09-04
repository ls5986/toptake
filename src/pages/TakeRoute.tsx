import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/LoadingSpinner';
import { TakeCard } from '@/components/TakeCard';
import { Take } from '@/types';

const TakeRoute: React.FC = () => {
  const { username, date, takeId } = useParams();
  const [take, setTake] = useState<Take | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Resolve username to user id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('username', String(username))
          .maybeSingle();
        if (!profile?.id) { setLoading(false); return; }
        // Fetch take by id and user/date guard
        const { data } = await supabase
          .from('takes')
          .select('id,user_id,content,created_at,prompt_date,is_anonymous, profiles(username)')
          .eq('id', String(takeId))
          .eq('user_id', profile.id)
          .maybeSingle();
        if (data) {
          setTake({
            id: data.id,
            userId: data.user_id,
            content: data.content,
            username: data.is_anonymous ? 'Anonymous' : (data.profiles?.username || 'Unknown'),
            isAnonymous: data.is_anonymous,
            timestamp: data.created_at,
            prompt_date: data.prompt_date,
            commentCount: 0
          } as any);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [username, date, takeId]);

  if (loading) return <LoadingSpinner />;
  if (!take) return <Navigate to={`/${username}`} replace />;
  return (
    <div className="max-w-2xl mx-auto p-4">
      <TakeCard take={take} onReact={() => {}} />
    </div>
  );
};

export default TakeRoute;


