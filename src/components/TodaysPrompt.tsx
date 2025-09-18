import React from 'react';
import { getThemeColors, deriveThemeSurfaces } from '@/lib/themes';
import { useTheme } from '@/components/theme-provider';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Flame } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { format, isToday } from 'date-fns';

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
  const { user } = useAppContext();
  const { theme } = useTheme();
  const c = getThemeColors(theme);
  const surfaces = deriveThemeSurfaces(c);

  const displayPrompt = propPrompt || '';
  const isCurrentDay = isToday(selectedDate);
  const dateLabel = isCurrentDay ? "Today's Topic" : `${format(selectedDate, 'MMM dd, yyyy')} Topic`;

  if (loading) {
    return (
      <Card style={{ background: surfaces.surface, borderColor: surfaces.border, borderWidth: 1 }}>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center justify-center text-brand-text">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent mr-4"></div>
            Loading prompt...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!displayPrompt) {
    return (
      <Card style={{ background: surfaces.surface, borderColor: surfaces.border, borderWidth: 1 }}>
        <CardContent className="p-3 md:p-4">
          <div className="text-brand-danger font-medium text-sm">No prompt found for {dateLabel.toLowerCase()}!</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ background: surfaces.surface, borderColor: surfaces.border, borderWidth: 1 }}>
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start gap-2">
          <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: c.accent }} />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-brand-muted mb-1">{dateLabel}</div>
            <p className="text-brand-text/95 text-sm md:text-base leading-snug md:leading-normal">{displayPrompt}</p>
            <div className="mt-2 flex items-center gap-3 text-[12px] text-brand-muted">
              <span className="inline-flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-brand-accent" />{takeCount} posted</span>
              {user?.hasPostedToday && isCurrentDay && (
                <span className="inline-flex items-center gap-1 text-brand-primary">
                  <Flame className="w-3.5 h-3.5" />Streak {user.streak}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodaysPrompt;