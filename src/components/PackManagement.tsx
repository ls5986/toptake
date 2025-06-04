import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserX, Zap, History, Plus, Gift } from 'lucide-react';

interface User {
  id: string;
  username: string;
  anonymous_uses_remaining: number;
  delete_uses_remaining: number;
  boost_uses_remaining: number;
  history_unlocked: boolean;
  extra_takes_remaining: number;
}

export const PackManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [packType, setPackType] = useState('');
  const [packUses, setPackUses] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const packTypes = [
    { value: 'anonymous', label: 'Anonymous Posts', icon: UserX },
    { value: 'delete', label: 'Delete Uses', icon: Trash2 },
    { value: 'boost', label: 'Boost Uses', icon: Zap },
    { value: 'history', label: 'History Access', icon: History },
    { value: 'extra_take', label: 'Extra Takes', icon: Plus }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, anonymous_uses_remaining, delete_uses_remaining, boost_uses_remaining, history_unlocked, extra_takes_remaining')
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error loading users', variant: 'destructive' });
    }
  };

  const grantPack = async () => {
    if (!selectedUser || !packType || packUses < 1) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const fieldMap = {
        anonymous: 'anonymous_uses_remaining',
        delete: 'delete_uses_remaining',
        boost: 'boost_uses_remaining',
        extra_take: 'extra_takes_remaining',
        history: 'history_unlocked'
      };

      const field = fieldMap[packType as keyof typeof fieldMap];
      const currentUser = users.find(u => u.id === selectedUser);
      
      if (!currentUser) throw new Error('User not found');

      let updateValue;
      if (packType === 'history') {
        updateValue = true;
      } else {
        updateValue = (currentUser[field as keyof User] as number) + packUses;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ [field]: updateValue })
        .eq('id', selectedUser);

      if (error) throw error;

      await supabase
        .from('feature_packs')
        .insert({
          user_id: selectedUser,
          type: packType,
          uses_granted: packUses,
          uses_remaining: packUses
        });

      toast({ title: 'Pack granted successfully!' });
      await fetchUsers();
      setSelectedUser('');
      setPackType('');
      setPackUses(1);
    } catch (error) {
      console.error('Error granting pack:', error);
      toast({ title: 'Error granting pack', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Grant Feature Packs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={packType} onValueChange={setPackType}>
              <SelectTrigger>
                <SelectValue placeholder="Pack type" />
              </SelectTrigger>
              <SelectContent>
                {packTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              min="1"
              value={packUses}
              onChange={(e) => setPackUses(parseInt(e.target.value) || 1)}
              placeholder="Uses"
              disabled={packType === 'history'}
            />

            <Button onClick={grantPack} disabled={loading}>
              {loading ? 'Granting...' : 'Grant Pack'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Pack Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded">
                <span className="font-medium">{user.username}</span>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">
                    👻 {user.anonymous_uses_remaining}
                  </Badge>
                  <Badge variant="outline">
                    🗑️ {user.delete_uses_remaining}
                  </Badge>
                  <Badge variant="outline">
                    ⚡ {user.boost_uses_remaining}
                  </Badge>
                  <Badge variant="outline">
                    📚 {user.history_unlocked ? '✅' : '❌'}
                  </Badge>
                  <Badge variant="outline">
                    ➕ {user.extra_takes_remaining}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};