import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, UserPlus, Users, ArrowLeft } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface Friend {
  id: string;
  username: string;
  streak: number;
  isOnline: boolean;
}

const FriendsScreen: React.FC = () => {
  const { setCurrentScreen, user } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'search'>('friends');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, current_streak')
        .neq('id', user.id)
        .limit(10);
      
      if (error) throw error;
      
      const friendsData = data?.map(profile => ({
        id: profile.id,
        username: profile.username,
        streak: profile.current_streak || 0,
        isOnline: Math.random() > 0.5
      })) || [];
      
      setFriends(friendsData);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const searchUsers = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, current_streak')
        .ilike('username', `%${searchTerm}%`)
        .neq('id', user?.id || '')
        .limit(20);
      
      if (error) throw error;
      
      const results = data?.map(profile => ({
        id: profile.id,
        username: profile.username,
        streak: profile.current_streak || 0,
        isOnline: Math.random() > 0.5
      })) || [];
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({ title: 'Error searching users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addFriend = async (userId: string, username: string) => {
    toast({ title: `Friend request sent to ${username}!`, duration: 3000 });
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 min-h-screen">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center mb-6">
          <Button
            onClick={() => setCurrentScreen('main')}
            variant="ghost"
            size="sm"
            className="text-white mr-4"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <Users className="w-8 h-8 mr-2" />
            Friends
          </h1>
        </div>

        <div className="flex space-x-2 mb-6">
          <Button
            onClick={() => setActiveTab('friends')}
            variant={activeTab === 'friends' ? 'default' : 'outline'}
            className={activeTab === 'friends' ? 'bg-purple-600' : 'border-purple-400 text-purple-400'}
          >
            My Friends ({friends.length})
          </Button>
          <Button
            onClick={() => setActiveTab('search')}
            variant={activeTab === 'search' ? 'default' : 'outline'}
            className={activeTab === 'search' ? 'bg-purple-600' : 'border-purple-400 text-purple-400'}
          >
            <Search className="w-4 h-4 mr-1" />
            Find Friends
          </Button>
        </div>

        {activeTab === 'search' && (
          <div className="mb-6">
            <div className="flex space-x-2">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for users..."
                className="bg-gray-800 border-gray-600 text-white"
                onKeyPress={(e) => e.key === 'Enter' && searchUsers()}
              />
              <Button onClick={searchUsers} className="bg-purple-600" disabled={loading}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {activeTab === 'friends' && friends.map((friend) => (
            <Card key={friend.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${friend.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <div>
                      <p className="text-white font-medium">{friend.username}</p>
                      <p className="text-gray-400 text-sm">
                        🔥 {friend.streak} day streak
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {activeTab === 'search' && searchResults.map((user) => (
            <Card key={user.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                    <div>
                      <p className="text-white font-medium">{user.username}</p>
                      <p className="text-gray-400 text-sm">
                        🔥 {user.streak} day streak
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => addFriend(user.id, user.username)}
                    className="bg-purple-600"
                    size="sm"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {activeTab === 'search' && searchTerm && searchResults.length === 0 && !loading && (
          <div className="text-center text-gray-400 py-8">
            <p>No users found matching "{searchTerm}"</p>
          </div>
        )}

        {activeTab === 'friends' && friends.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <p>No friends yet. Use the search tab to find people!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsScreen;