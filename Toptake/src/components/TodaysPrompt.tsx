import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface TodaysPromptProps {
  prompt?: string;
  takeCount: number;
  selectedDate?: Date;
}

export const TodaysPrompt: React.FC<TodaysPromptProps> = ({ 
  prompt: propPrompt, 
  takeCount, 
  selectedDate = new Date() 
}) => {
  const { user, setCurrentScreen, currentPrompt } = useAppContext();
  
  const handleJoinConversation = () => {
    if (!user?.hasPostedToday) {
      setCurrentScreen('dailyPrompt');
    }
  };

  const displayPrompt = propPrompt || currentPrompt || "What's one controversial opinion you hold that most people would disagree with?";
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  const dateLabel = isToday ? "Today's Topic" : `${format(selectedDate, 'MMM dd, yyyy')} Topic`;

  return (
    <Card className="bg-gradient-to-r from-slate-600 to-zinc-600 border-none">
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <div className="bg-white/20 rounded-full p-2">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold text-lg mb-2">{dateLabel}</h3>
            <p className="text-white/90 text-base leading-relaxed mb-3">{displayPrompt}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-white/70 text-sm">
                <span>💬 {takeCount} takes posted</span>
                {user?.hasPostedToday && isToday && (
                  <span className="text-green-300">✅ Streak: {user.streak}</span>
                )}
              </div>
              {!user?.hasPostedToday && isToday && (
                <Button 
                  onClick={handleJoinConversation}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  variant="outline"
                  size="sm"
                >
                  🔥 Join the conversation
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