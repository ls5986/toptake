import React, { useEffect, useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/LoadingSpinner';
import { TakeCard } from '@/components/TakeCard';
import { Card, CardContent } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Take } from '@/types';

const TakeRoute: React.FC = () => {
  const { username, date, takeId } = useParams();
  const [take, setTake] = useState<Take | null>(null);
  const [loading, setLoading] = useState(true);
  const [promptText, setPromptText] = useState<string>('');

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
          // Load prompt text for this date
          if (data.prompt_date) {
            const { data: pr } = await supabase
              .from('daily_prompts')
              .select('prompt_text')
              .eq('prompt_date', data.prompt_date)
              .maybeSingle();
            setPromptText(pr?.prompt_text || '');
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [username, date, takeId]);

  if (loading) return <LoadingSpinner />;
  if (!take) return <Navigate to={`/${username}`} replace />;
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-3">
      {promptText && (
        <Card className="bg-brand-surface border-brand-border">
          <CardContent className="p-3">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 mt-0.5 text-brand-accent" />
              <div className="flex-1 min-w-0">
                <div className="text-brand-text/90 text-sm leading-snug">{promptText}</div>
                {take.prompt_date && (
                  <div className="mt-0.5 text-[11px] text-brand-muted">For {format(new Date(take.prompt_date), 'MMM d, yyyy')}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <TakeCard take={take} onReact={() => {}} />
    </div>
  );
};

export default TakeRoute;


