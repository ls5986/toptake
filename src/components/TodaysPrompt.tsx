import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Flame } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface TodaysPromptProps {
  prompt?: string;
  takeCount: number;
  selectedDate?: Date;
  loading?: boolean;
}

export const TodaysPrompt: React.FC<TodaysPromptProps> = ({ 
  prompt: propPrompt, 
  takeCount, 
  selectedDate = new Date(),
  loading = false
}) => {
  const { user, setCurrentScreen } = useAppContext();
  
  const handleJoinConversation = () => {
    if (!user?.hasPostedToday) {
      setCurrentScreen('dailyPrompt');
    }
  };

  const displayPrompt = propPrompt || '';
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const dateLabel = isToday ? "Today's Topic" : `${format(selectedDate, 'MMM dd, yyyy')} Topic`;

  if (loading) {
    return (
      <Card className="bg-card-gradient">
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-brand-text">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mr-4"></div>
            Loading prompt...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayPrompt) {
    console.log('No prompt found for date:', selectedDate);
    return (
      <Card className="bg-card-gradient">
        <CardContent className="p-6">
          <div className="text-brand-danger font-semibold">No prompt found for this day! (Check prompt date, timezone, and is_active in Supabase)</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card-gradient">
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <div className="bg-brand-surface rounded-full p-2">
            <MessageSquare className="w-5 h-5 text-brand-text" />
          </div>
          <div className="flex-1">
            <h3 className="text-brand-text font-semibold text-lg mb-2">{dateLabel}</h3>
            <p className="text-brand-text/90 text-base leading-relaxed mb-3">{displayPrompt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-brand-muted text-sm">
                <span><MessageSquare className="inline w-4 h-4 mr-1 text-brand-accent" />{takeCount} takes posted</span>
                {user?.hasPostedToday && isToday && (
                  <span className="flex items-center gap-1 text-brand-primary font-semibold">
                    <Flame className="w-4 h-4 text-brand-primary" />
                    Streak: {user.streak}
                  </span>
                )}
              </div>
              {!user?.hasPostedToday && isToday && (
                <Button 
                  onClick={handleJoinConversation}
                  className="btn-primary"
                  size="sm"
                >
                  <Flame className="w-4 h-4 mr-1 text-brand-primary" />Join the conversation
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodaysPrompt;