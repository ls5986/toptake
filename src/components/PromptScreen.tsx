import React, { useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Send } from 'lucide-react';
import { hasFeatureCredit } from '@/lib/featureCredits';
import BillingModal from './BillingModal';
import { useToast } from '@/hooks/use-toast';

const PromptScreen: React.FC = () => {
  const { currentPrompt, submitTake, setCurrentScreen, hasPostedToday, user } = useAppContext();
  const [takeContent, setTakeContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLateSubmitModal, setShowLateSubmitModal] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const { toast } = useToast();

  // Helper: is prompt expired?
  const isPromptExpired = currentPrompt && new Date(currentPrompt.expiry) < new Date();
  const canLateSubmit = user && hasFeatureCredit(user, 'late_submit');

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

  const handleLateSubmit = async () => {
    if (!takeContent.trim() || isSubmitting) return;
    setIsSubmitting(true);
    // Insert take with is_late_submit = true and backdate created_at
    const takeData = {
      content: takeContent,
      is_anonymous: isAnonymous,
      is_late_submit: true,
      created_at: currentPrompt?.created_at, // backdate
      prompt_id: currentPrompt?.id,
      user_id: user.id,
    };
    const { error } = await supabase.from('takes').insert([takeData]);
    if (!error) {
      toast({ title: 'Late Take Submitted', description: 'Your take was submitted and backdated to the prompt date.' });
      setCurrentScreen('main');
    } else {
      alert('Failed to submit late take.');
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

            {isPromptExpired && !hasPostedToday && (
              canLateSubmit ? (
                <Button
                  onClick={() => setShowLateSubmitModal(true)}
                  className="w-full bg-yellow-400 text-yellow-900 hover:bg-yellow-500 mt-4"
                >
                  ⏰ Late Submit (use credit)
                </Button>
              ) : (
                <Button
                  onClick={() => setShowPurchaseModal(true)}
                  className="w-full bg-yellow-200 text-yellow-900 hover:bg-yellow-300 mt-4"
                >
                  Buy Late Submit Credit
                </Button>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Late Submit Modal */}
      <BillingModal isOpen={showPurchaseModal} onClose={() => setShowPurchaseModal(false)} />
      {/* Confirm Late Submit Modal */}
      {showLateSubmitModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold mb-2">Confirm Late Submit</h2>
            <p className="mb-4">This will use 1 Late Submit credit and backdate your take to the prompt date.</p>
            <div className="flex space-x-2">
              <Button onClick={() => setShowLateSubmitModal(false)} variant="outline">Cancel</Button>
              <Button onClick={handleLateSubmit} className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500">
                Confirm & Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptScreen;