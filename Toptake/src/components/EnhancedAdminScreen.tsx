import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, TrendingUp, Zap, Sparkles, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import ExecutiveDashboard from '@/components/ExecutiveDashboard';
import AutoScheduler from '@/components/AutoScheduler';
import SmartPromptGenerator from '@/components/SmartPromptGenerator';
import EnhancedPromptRecommendations from '@/components/EnhancedPromptRecommendations';
import PromptAnalytics from '@/components/PromptAnalytics';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  streak: number;
  drama_score: number;
  created_at: string;
}

const EnhancedAdminScreen: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editStreak, setEditStreak] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setUsers(profiles || []);
      setTotalUsers(profiles?.length || 0);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({ title: 'Error loading data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const addNonAuthUser = async () => {
    if (!newUsername.trim()) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          username: newUsername.trim(),
          email: `${newUsername.trim()}@fake.com`,
          streak: 0,
          drama_score: 0,
          anonymous_credits: 3
        });
      
      if (error) throw error;
      
      setNewUsername('');
      loadAdminData();
      toast({ title: 'User added successfully' });
    } catch (error) {
      console.error('Error adding user:', error);
      toast({ title: 'Error adding user', variant: 'destructive' });
    }
  };

  const updateUserStreak = async () => {
    if (!selectedUser || !editStreak) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ streak: parseInt(editStreak) })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      setSelectedUser(null);
      setEditStreak('');
      loadAdminData();
      toast({ title: 'Streak updated successfully' });
    } catch (error) {
      console.error('Error updating streak:', error);
      toast({ title: 'Error updating streak', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p>Loading admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white flex items-center space-x-2">
            <Zap className="h-8 w-8 text-yellow-400" />
            <span>AI-Powered Admin Hub</span>
          </h1>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {totalUsers} Total Users
          </Badge>
        </div>
        
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="dashboard" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="automation" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Automation</span>
            </TabsTrigger>
            <TabsTrigger value="generator" className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>AI Generator</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4" />
              <span>Suggestions</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard" className="space-y-6">
            <ExecutiveDashboard />
          </TabsContent>
          
          <TabsContent value="automation" className="space-y-6">
            <AutoScheduler />
          </TabsContent>
          
          <TabsContent value="generator" className="space-y-6">
            <SmartPromptGenerator />
          </TabsContent>
          
          <TabsContent value="suggestions" className="space-y-6">
            <EnhancedPromptRecommendations />
          </TabsContent>
          
          <TabsContent value="analytics" className="space-y-6">
            <PromptAnalytics />
          </TabsContent>
          
          <TabsContent value="users" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-white text-sm font-medium">Add Test User</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      />
                      <Button onClick={addNonAuthUser} variant="secondary">
                        Add User
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-white text-sm font-medium">Edit User Streak</label>
                    <select 
                      className="w-full p-2 border rounded bg-white/10 border-white/20 text-white"
                      onChange={(e) => {
                        const user = users.find(u => u.id === e.target.value);
                        setSelectedUser(user || null);
                        setEditStreak(user?.streak.toString() || '');
                      }}
                    >
                      <option value="" className="text-black">Select user...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id} className="text-black">
                          {user.username}
                        </option>
                      ))}
                    </select>
                    
                    {selectedUser && (
                      <div className="space-y-2">
                        <Input
                          type="number"
                          placeholder="New streak"
                          value={editStreak}
                          onChange={(e) => setEditStreak(e.target.value)}
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        />
                        <Button onClick={updateUserStreak} variant="secondary" className="w-full">
                          Update Streak
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/5 backdrop-blur-sm border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">User Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{totalUsers}</p>
                      <p className="text-white/70 text-sm">Total Users</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">
                        {users.length > 0 ? Math.round(users.reduce((sum, u) => sum + u.streak, 0) / users.length) : 0}
                      </p>
                      <p className="text-white/70 text-sm">Avg Streak</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">
                        {Math.floor(totalUsers * 0.3)}
                      </p>
                      <p className="text-white/70 text-sm">Active Today</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">
                        {users.filter(u => u.streak > 0).length}
                      </p>
                      <p className="text-white/70 text-sm">On Streak</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader>
                <CardTitle className="text-white">All Users ({totalUsers})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                          <div className="font-medium text-white">{user.username}</div>
                          <div className="text-sm text-white/70">{user.email}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-purple-600/20 text-purple-200">
                            Streak: {user.streak}
                          </Badge>
                          <Badge variant="outline" className="border-white/20 text-white/70">
                            Score: {user.drama_score}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedAdminScreen;