import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PromptDisplayProps {
  prompt: string;
  dayNumber: number;
  className?: string;
}

export const PromptDisplay: React.FC<PromptDisplayProps> = ({ 
  prompt, 
  dayNumber, 
  className = '' 
}) => {
  return (
    <Card className={`bg-gradient-to-r from-purple-600 to-blue-600 border-none ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Badge className="bg-white/20 text-white border-none">
            Day {dayNumber}
          </Badge>
          <div className="flex-1">
            <p className="text-white font-medium leading-relaxed">
              {prompt}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PromptDisplay;