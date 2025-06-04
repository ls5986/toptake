import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MessageSquare, Send, Eye, EyeOff } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useDailyPrompt } from '@/hooks/useDailyPrompt';
import { toast } from '@/hooks/use-toast';

const DailyPromptScreen: React.FC = () => {
  const { user, setCurrentScreen, submitTake } = useAppContext();
  const { currentPrompt } = useDailyPrompt();
  const [take, setTake] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!take.trim() || !user) {
      toast({
        title: "Error",
        description: "Please write your take before submitting.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const success = await submitTake(take.trim(), isAnonymous);
      
      if (success) {
        const fakeTakes = JSON.parse(localStorage.getItem('fakeTakes') || '[]');
        fakeTakes.unshift({
          id: Date.now().toString(),
          content: take.trim(),
          username: isAnonymous ? 'Anonymous' : user.username,
          isAnonymous,
          reactions: { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 },
          commentCount: 0,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem('fakeTakes', JSON.stringify(fakeTakes));

        toast({
          title: "Success!",
          description: "Your take has been posted successfully."
        });

        setCurrentScreen('feed');
      } else {
        throw new Error('Failed to submit take');
      }
      
    } catch (error) {
      console.error('Error submitting take:', error);
      toast({
        title: "Error",
        description: "Failed to submit your take. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Today's Prompt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-lg">
            <p className="text-white text-lg font-medium">{currentPrompt}</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="take" className="text-white mb-2 block">
                Your Take
              </Label>
              <Textarea
                id="take"
                placeholder="Share your thoughts..."
                value={take}
                onChange={(e) => setTake(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 min-h-[120px] resize-none"
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-400 mt-1">
                {take.length}/500
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
              />
              <Label htmlFor="anonymous" className="text-white flex items-center gap-2">
                {isAnonymous ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                Post anonymously
              </Label>
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={!take.trim() || isSubmitting}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              size="lg"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Posting...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  Post Your Take
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyPromptScreen;