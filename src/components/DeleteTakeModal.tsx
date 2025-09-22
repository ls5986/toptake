import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/contexts/AppContext';
import { spendCredits } from '@/lib/credits';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface DeleteTakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  takeId: string;
  onDeleteSuccess?: () => void;
}

const DeleteTakeModal: React.FC<DeleteTakeModalProps> = ({ 
  isOpen, 
  onClose, 
  takeId, 
  onDeleteSuccess 
}) => {
  const { user, userCredits, setUserCredits } = useAppContext();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!user?.id) {
      toast({ 
        title: 'Error', 
        description: 'User not found', 
        variant: 'destructive' 
      });
      return;
    }

    if (userCredits.delete <= 0) {
      toast({ 
        title: 'Insufficient Credits', 
        description: 'You need delete credits to delete a take. Purchase some credits to continue.', 
        variant: 'destructive' 
      });
      return;
    }

    if (!confirm('Are you sure you want to delete this take? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      
      // Spend the delete credit
      const spent = await spendCredits(user.id, 'delete', 1);
      if (!spent) {
        toast({ 
          title: 'Error', 
          description: 'Failed to spend delete credit. Please try again.', 
          variant: 'destructive' 
        });
        return;
      }

      // Delete the take from the database
      const { error } = await supabase
        .from('takes')
        .delete()
        .eq('id', takeId)
        .eq('user_id', user.id); // Ensure user can only delete their own takes

      if (error) {
        console.error('Error deleting take:', error);
        toast({ 
          title: 'Error', 
          description: 'Failed to delete take. Please try again.', 
          variant: 'destructive' 
        });
        return;
      }

      // Update local state
      setUserCredits({ ...userCredits, delete: userCredits.delete - 1 });
      toast({ title: 'Delete credit used', description: '-1 Delete credit' });

      toast({ 
        title: 'Take Deleted', 
        description: 'Your take has been successfully deleted.' 
      });

      onDeleteSuccess?.();
      onClose();
      
    } catch (error) {
      console.error('Error deleting take:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to delete take. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Take</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Delete this take permanently. This action cannot be undone.
          </p>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm font-medium">Your Delete Credits: {userCredits.delete}</p>
            <p className="text-xs text-gray-500">Cost: 1 delete credit</p>
          </div>

          <div className="flex justify-between gap-3">
            <Button variant="outline" onClick={onClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button 
              onClick={handleDelete} 
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting || userCredits.delete <= 0}
            >
              {isDeleting ? 'Deleting...' : 'Delete Take'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteTakeModal; 