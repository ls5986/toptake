import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Send } from 'lucide-react';

const PromptScreen: React.FC = () => {
  const { currentPrompt, submitTake, setCurrentScreen, hasPostedToday, user } = useAppContext();
  const [takeContent, setTakeContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!takeContent.trim() || isSubmitting) return;
    
    if (hasPostedToday) {
      alert('You have already posted today!');
      return;
    }

    setIsSubmitting(true);
    const success = await submitTake(takeContent, isAnonymous);
    
    if (success) {
      setCurrentScreen('main');
    } else {
      alert('Failed to submit take. You may have already posted today.');
    }
    setIsSubmitting(false);
  };

  if (hasPostedToday) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Already Posted Today!</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-4">You can only post one take per day. Come back tomorrow!</p>
            <Button onClick={() => setCurrentScreen('main')} className="w-full">
              Back to Feed
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentScreen('main')}
          className="text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-white font-semibold">Today's Prompt</h1>
        <div className="w-16" />
      </div>

      <div className="flex-1 p-4 space-y-6">
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white text-center text-lg">
              {currentPrompt?.text || 'Loading prompt...'}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="take" className="text-white mb-2 block">
                Your Take
              </Label>
              <Textarea
                id="take"
                placeholder="Share your thoughts..."
                value={takeContent}
                onChange={(e) => setTakeContent(e.target.value)}
                className="min-h-32 bg-white/5 border-white/20 text-white placeholder:text-white/50"
                maxLength={500}
              />
              <div className="text-right text-sm text-white/70 mt-1">
                {takeContent.length}/500
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={setIsAnonymous}
                disabled={!user?.anonymousCredits || user.anonymousCredits <= 0}
              />
              <Label htmlFor="anonymous" className="text-white">
                Post Anonymously ({user?.anonymousCredits || 0} credits left)
              </Label>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!takeContent.trim() || isSubmitting}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Take
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromptScreen;