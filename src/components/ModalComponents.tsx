import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppContext } from '@/contexts/AppContext';
import { UsernameModal } from './UsernameModal';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MissedStreakModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const { user, setUser } = useAppContext();
  
  const handleRestore = () => {
    if (user) {
      setUser({ ...user, streak: user.streak + 1 });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
      <Card className="bg-gray-800 border-gray-700 max-w-sm">
        <CardHeader>
          <CardTitle className="text-white text-center">💀 Missed your streak?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-300">Revive it for $2.99</p>
          <div className="space-y-2">
            <Button onClick={handleRestore} className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
              💳 Restore Streak - $2.99
            </Button>
            <Button onClick={onClose} variant="outline" className="w-full border-gray-600 text-white">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const PremiumModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
      <Card className="bg-gray-800 border-gray-700 max-w-sm">
        <CardHeader>
          <CardTitle className="text-white text-center">✨ Go Premium</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-300">Unlock special features for $4.99/month</p>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• View feed without posting</li>
            <li>• Anonymous analytics</li>
            <li>• Choose prompt categories</li>
          </ul>
          <div className="space-y-2">
            <Button onClick={onClose} className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
              💎 Subscribe - $4.99/mo
            </Button>
            <Button onClick={onClose} variant="outline" className="w-full border-gray-600 text-white">
              Maybe Later
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const BlockingModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
      <Card className="bg-gray-800 border-gray-700 max-w-sm">
        <CardHeader>
          <CardTitle className="text-white text-center">🔥 You haven't posted today</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-gray-300">Submit your take to unlock the app</p>
          <Button onClick={onClose} className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
            📝 Post Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export { UsernameModal };