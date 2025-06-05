import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';

interface DailyPrompt {
  id: string;
  prompt_text: string;
  category?: string;
  prompt_date: string;
  is_active: boolean;
  created_at: string;
  source?: string;
}

interface CalendarDay {
  date: Date;
  prompt?: DailyPrompt;
  isToday: boolean;
  isPast: boolean;
  isCurrentMonth: boolean;
}

interface CalendarGridProps {
  calendarDays: CalendarDay[];
  isAdmin: boolean;
  onEditPrompt: (prompt: DailyPrompt) => void;
  onDeletePrompt: (promptId: string) => void;
}

const CalendarGrid: React.FC<CalendarGridProps> = ({
  calendarDays,
  isAdmin,
  onEditPrompt,
  onDeletePrompt
}) => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {dayNames.map(day => (
          <div key={day} className="p-2 text-center text-sm font-medium text-brand-muted">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`
              p-2 min-h-[100px] border rounded-lg relative group transition-colors
              ${day.isToday ? 'bg-brand-accent/10 border-brand-accent' : ''}
              ${day.isPast ? 'bg-brand-surface' : ''}
              ${day.prompt ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border'}
              ${!day.isCurrentMonth ? 'opacity-50' : ''}
              hover:bg-brand-surface/80'
            `}
          >
            <div className="text-sm font-medium mb-1">
              {day.date.getDate()}
            </div>
            {day.prompt ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Badge 
                    variant={day.prompt.is_active ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {day.prompt.source || 'prompt'}
                  </Badge>
                  {isAdmin && (
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={() => onEditPrompt(day.prompt!)}
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-brand-danger"
                        onClick={() => onDeletePrompt(day.prompt!.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
                <div className="text-xs text-brand-muted line-clamp-3">
                  {day.prompt.prompt_text.length > 60 
                    ? `${day.prompt.prompt_text.substring(0, 60)}...`
                    : day.prompt.prompt_text
                  }
                </div>
              </div>
            ) : (
              <div className="text-xs text-brand-muted">No prompt</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default CalendarGrid;