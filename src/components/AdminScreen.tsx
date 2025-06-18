import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import PromptAnalytics from '@/components/PromptAnalytics';
import PromptCalendar from '@/components/PromptCalendar';
import PromptGenerator from '@/components/PromptGenerator';
import PromptRecommendations from '@/components/PromptRecommendations';
import PromptScheduler from '@/components/PromptScheduler';
import { GitHubIntegration } from '@/components/GitHubIntegration';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  current_streak: number;
  created_at: string;
}

const AdminScreen: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [editStreak, setEditStreak] = useState('');
  const [tomorrowPrompt, setTomorrowPrompt] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAdminData();
    fetchTomorrowPrompt();
    calculateActiveUsers();
  }, []);

  const calculateActiveUsers = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Count users who have submitted takes today
      const { data: takesToday } = await supabase
        .from('takes')
        .select('user_id')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);
      
      const uniqueActiveUsers = new Set(takesToday?.map(t => t.user_id) || []);
      setActiveToday(uniqueActiveUsers.size);
    } catch (error) {
      console.error('Error calculating active users:', error);
      // Fallback to estimated value
      setActiveToday(Math.floor(totalUsers * 0.3));
    }
  };

  const fetchTomorrowPrompt = async () => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const { data } = await supabase
        .from('daily_prompts')
        .select('prompt_text')
        .eq('prompt_date', tomorrowStr)
        .single();
      
      if (data) {
        setTomorrowPrompt(data.prompt_text);
      } else {
        setTomorrowPrompt('No prompt scheduled for tomorrow yet');
      }
    } catch (error) {
      console.error('Error fetching tomorrow prompt:', error);
      setTomorrowPrompt('Error loading tomorrow\'s prompt');
    }
  };

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
      const { data: profileData, error } = await supabase
        .from('profiles')
        .insert({
          username: newUsername.trim(),
          email: `${newUsername.trim()}@fake.com`,
          current_streak: 0,
          is_premium: false,
          is_private: false,
          is_banned: false,
          is_admin: false,
          is_verified: false,
          longest_streak: 0,
          last_post_date: null,
          last_active_at: new Date().toISOString(),
          full_name: '',
          bio: '',
          avatar_url: ''
        })
        .select()
        .single();
      if (error) throw error;
      // Insert user_credits entry for anonymous credits
      await supabase.from('user_credits').insert({
        user_id: profileData.id,
        credit_type: 'anonymous',
        balance: 3
      });
      setNewUsername('');
      loadAdminData();
      calculateActiveUsers();
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
        .update({ current_streak: parseInt(editStreak) })
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

  const handleGitHubConnect = (repoUrl: string) => {
    toast({ title: 'GitHub Connected', description: `Connected to ${repoUrl}` });
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
    <div className="flex-1 p-4 bg-gradient-to-br from-brand-background via-purple-900 to-violet-900">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">🔧 Admin Dashboard</h1>
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="github">GitHub</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalUsers}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Today</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeToday}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Streak</CardTitle>
                  <Badge className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {users.length > 0 ? Math.round(users.reduce((sum, u) => sum + u.current_streak, 0) / users.length) : 0}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {tomorrowPrompt && (
              <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 border-none">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <div className="bg-white/20 rounded-full p-2">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg mb-2">Tomorrow's Prompt</h3>
                      <p className="text-white/90 text-base leading-relaxed">{tomorrowPrompt}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="schedule">
            <PromptScheduler />
          </TabsContent>
          
          <TabsContent value="calendar">
            <PromptCalendar />
          </TabsContent>
          
          <TabsContent value="analytics">
            <PromptAnalytics />
          </TabsContent>
          
          <TabsContent value="suggestions">
            <PromptRecommendations />
          </TabsContent>
          
          <TabsContent value="generate">
            <PromptGenerator />
          </TabsContent>
          
          <TabsContent value="github">
            <GitHubIntegration onConnect={handleGitHubConnect} />
          </TabsContent>
          
          <TabsContent value="users">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Add Test User</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                    <Button onClick={addNonAuthUser}>Add User</Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Edit Streak</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <select 
                    className="w-full p-2 border rounded"
                    onChange={(e) => {
                      const user = users.find(u => u.id === e.target.value);
                      setSelectedUser(user || null);
                      setEditStreak(user?.current_streak.toString() || '');
                    }}
                  >
                    <option value="">Select user...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                  </select>
                  
                  {selectedUser && (
                    <div className="space-y-2">
                      <Input
                        type="number"
                        placeholder="New streak"
                        value={editStreak}
                        onChange={(e) => setEditStreak(e.target.value)}
                      />
                      <Button onClick={updateUserStreak}>Update Streak</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>All Users ({totalUsers})</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-brand-muted">{user.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Streak: {user.current_streak}</Badge>
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

export default AdminScreen;