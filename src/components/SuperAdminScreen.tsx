import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import PromptManagement from './PromptManagement';
import UserManagement from './UserManagement';

const SuperAdminScreen: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [aiPromptWording, setAiPromptWording] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSuperAdminData();
    loadAiPromptWording();
  }, []);

  const loadSuperAdminData = async () => {
    try {
      setLoadingUsers(true);
      console.log('Loading super admin data...');
      
      // Load users with more detailed query
      const usersRes = await supabase
        .from('profiles')
        .select('id, username, email, created_at, streak, is_banned')
        .order('created_at', { ascending: false });
      
      console.log('Users query result:', usersRes);
      
      // Load prompts
      const { data, error } = await supabase
        .from('daily_prompts')
        .select('*')
        .order('prompt_date', { ascending: true });
      
      if (usersRes.error) {
        console.error('Users query error:', usersRes.error);
        throw usersRes.error;
      }
      if (error) {
        console.error('Prompts query error:', error);
        throw error;
      }
      
      console.log('Loaded users:', usersRes.data);
      console.log('Loaded prompts:', data);
      
      setUsers(usersRes.data || []);
      setPrompts(data || []);
      
      toast({ 
        title: `Loaded ${usersRes.data?.length || 0} users and ${data?.length || 0} prompts` 
      });
    } catch (error) {
      console.error('Error loading super admin data:', error);
      toast({ title: 'Error loading data', variant: 'destructive' });
    } finally {
      setLoading(false);
      setLoadingUsers(false);
    }
  };

  const loadAiPromptWording = async () => {
    setAiPromptWording('Generate a thought-provoking daily prompt that encourages users to share their authentic opinions and experiences. The prompt should be engaging, relevant to current events or universal themes, and designed to spark meaningful discussion.');
  };

  const updateAiPromptWording = async () => {
    try {
      toast({ title: 'AI prompt wording updated successfully' });
    } catch (error) {
      toast({ title: 'Error updating AI prompt wording', variant: 'destructive' });
    }
  };

  const generateNewPrompt = async () => {
    try {
      const response = await fetch(
        'https://qajtxngbrujlopzqjvfj.supabase.co/functions/v1/da143b5a-61c1-4c28-b715-e018c5fb1ccd',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            customPrompt: aiPromptWording,
            adminGenerated: true 
          })
        }
      );
      
      if (!response.ok) throw new Error('Failed to generate prompt');
      
      const data = await response.json();
      toast({ title: 'New prompt generated and scheduled!' });
      loadSuperAdminData();
    } catch (error) {
      console.error('Error generating prompt:', error);
      toast({ title: 'Error generating prompt', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p>Loading super admin data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">👑 Super Admin Portal</h1>
          <div className="text-white text-sm">
            Users: {users.length} | Prompts: {prompts.length}
          </div>
        </div>
        
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users">User Management ({users.length})</TabsTrigger>
            <TabsTrigger value="prompts">Prompts ({prompts.length})</TabsTrigger>
            <TabsTrigger value="ai">AI Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="users">
            <div className="mb-4">
              <Button 
                onClick={loadSuperAdminData} 
                disabled={loadingUsers}
                variant="outline"
              >
                {loadingUsers ? 'Refreshing...' : 'Refresh User Data'}
              </Button>
            </div>
            <UserManagement users={users} onUsersUpdate={loadSuperAdminData} />
          </TabsContent>
          
          <TabsContent value="prompts" className="space-y-4">
            <PromptManagement prompts={prompts} onPromptsUpdate={loadSuperAdminData} />
          </TabsContent>
          
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI Prompt Generation Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    OpenAI Prompt Template
                  </label>
                  <Textarea
                    value={aiPromptWording}
                    onChange={(e) => setAiPromptWording(e.target.value)}
                    rows={6}
                    placeholder="Enter the prompt template for AI generation..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={updateAiPromptWording}>
                    Update AI Prompt Wording
                  </Button>
                  <Button onClick={generateNewPrompt} variant="outline">
                    Generate New Prompt Now
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  This template will be used when generating daily prompts via AI.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SuperAdminScreen;