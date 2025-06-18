import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Trash2, UserX, Zap, History, Plus, Gift } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { CreditType } from '@/lib/credits';

interface User {
  id: string;
  username: string;
  user_credits: {
    anonymous: number;
    late_submit: number;
    sneak_peek: number;
    boost: number;
    extra_takes: number;
    delete: number;
  };
}

export const PackManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [creditType, setCreditType] = useState<CreditType>('anonymous');
  const [amount, setAmount] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const creditTypes: { value: CreditType; label: string; icon: any }[] = [
    { value: 'anonymous', label: 'Anonymous Credits', icon: UserX },
    { value: 'late_submit', label: 'Late Submit Credits', icon: History },
    { value: 'sneak_peek', label: 'Sneak Peek Credits', icon: Gift },
    { value: 'boost', label: 'Boost Credits', icon: Zap },
    { value: 'extra_takes', label: 'Extra Takes', icon: Plus },
    { value: 'delete', label: 'Delete Credits', icon: Trash2 }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          user_credits (
            anonymous,
            late_submit,
            sneak_peek,
            boost,
            extra_takes,
            delete
          )
        `)
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error loading users', variant: 'destructive' });
    }
  };

  const handleAddCredits = async () => {
    if (!selectedUser || !creditType || amount <= 0) {
      toast({ title: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Add credits to user_credits
      const { error: creditError } = await supabase
        .from('user_credits')
        .update({ [creditType]: amount })
        .eq('user_id', selectedUser);

      if (creditError) throw creditError;

      // Record in credit history
      const { error: historyError } = await supabase
        .from('credit_history')
        .insert({
          user_id: selectedUser,
          credit_type: creditType,
          amount,
          action: 'purchase',
          description: `Admin added ${amount} ${creditType} credits`
        });

      if (historyError) throw historyError;

      toast({ title: 'Credits added successfully' });
      fetchUsers();
    } catch (error) {
      console.error('Error adding credits:', error);
      toast({ title: 'Error adding credits', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Manage User Credits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={creditType} onValueChange={(value: CreditType) => setCreditType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select credit type" />
              </SelectTrigger>
              <SelectContent>
                {creditTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className="h-4 w-4" />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              placeholder="Amount"
            />

            <Button
              onClick={handleAddCredits}
              disabled={loading || !selectedUser || !creditType || amount <= 0}
              className="w-full"
            >
              {loading ? 'Adding...' : 'Add Credits'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Credit Balances</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="border rounded p-4">
                <h3 className="font-semibold mb-2">{user.username}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {creditTypes.map((type) => (
                    <div key={type.value} className="flex items-center justify-between">
                      <span className="text-sm">{type.label}:</span>
                      <Badge variant="secondary">
                        {user.user_credits[type.value]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};