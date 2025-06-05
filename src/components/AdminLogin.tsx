import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface AdminLoginProps {
  onAdminLogin: (isSuperAdmin: boolean) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onAdminLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    setLoading(true);
    
    // Check for super admin access
    if (email === 'lindsey@letsclink.com' && password === 'superadmin123') {
      onAdminLogin(true); // Super admin
      toast({ title: 'Super Admin access granted' });
    }
    // Check for regular admin access
    else if (password === 'admin123') {
      onAdminLogin(false); // Regular admin
      toast({ title: 'Admin access granted' });
    } else {
      toast({ title: 'Invalid credentials', variant: 'destructive' });
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-background via-brand-surface to-brand-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-brand-surface border-brand-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-brand-text">Admin Access</CardTitle>
          <p className="text-brand-muted">Enter credentials to continue</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-brand-background border-brand-border text-brand-text placeholder:text-brand-muted"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            className="bg-brand-background border-brand-border text-brand-text placeholder:text-brand-muted"
          />
          <Button 
            onClick={handleLogin} 
            disabled={loading || !email || !password}
            className="w-full bg-brand-primary hover:bg-brand-accent text-brand-text"
          >
            {loading ? 'Verifying...' : 'Access Admin Panel'}
          </Button>
          <div className="text-xs text-brand-muted text-center space-y-1">
            <p>Super Admin: lindsey@letsclink.com / superadmin123</p>
            <p>Regular Admin: any email / admin123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;