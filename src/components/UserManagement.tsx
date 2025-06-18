import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { User as AppUser } from '@/types';

interface UserManagementProps {
  users: AppUser[];
  onUsersUpdate: () => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onUsersUpdate }) => {
  const { toast } = useToast();

  const banUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: true })
        .eq('id', userId);
      
      if (error) throw error;
      
      onUsersUpdate();
      toast({ title: 'User banned successfully' });
    } catch (error) {
      toast({ title: 'Error banning user', variant: 'destructive' });
    }
  };

  const unbanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: false })
        .eq('id', userId);
      
      if (error) throw error;
      
      onUsersUpdate();
      toast({ title: 'User unbanned successfully' });
    } catch (error) {
      toast({ title: 'Error unbanning user', variant: 'destructive' });
    }
  };

  const resetStreak = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ streak: 0 })
        .eq('id', userId);
      
      if (error) throw error;
      
      onUsersUpdate();
      toast({ title: 'User streak reset' });
    } catch (error) {
      toast({ title: 'Error resetting streak', variant: 'destructive' });
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      onUsersUpdate();
      toast({ title: 'User deleted successfully' });
    } catch (error) {
      toast({ title: 'Error deleting user', variant: 'destructive' });
    }
  };

  const bannedUsers = users.filter(u => u.is_banned);
  const activeUsers = users.filter(u => !u.is_banned);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Banned Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{bannedUsers.length}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length} total)</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {users.length === 0 ? (
                <div className="text-center text-brand-muted py-8">
                  No users found. This might indicate a data loading issue.
                </div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{user.username}</div>
                      <div className="text-sm text-brand-muted">{user.email}</div>
                      <div className="text-xs text-brand-muted">
                        ID: {user.id.substring(0, 8)}... | Joined: {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Streak: {user.streak || 0}</Badge>
                      {user.is_banned ? (
                        <>
                          <Badge variant="destructive">Banned</Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => unbanUser(user.id)}
                          >
                            Unban
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => resetStreak(user.id)}
                          >
                            Reset Streak
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => banUser(user.id)}
                          >
                            Ban
                          </Button>
                        </>
                      )}
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => deleteUser(user.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;