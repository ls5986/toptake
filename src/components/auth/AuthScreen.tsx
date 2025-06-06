import React from 'react';
import { Button } from '@/components/ui/button';

interface AuthScreenProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  loading: boolean;
  handleLogin: () => void;
  handleSignup: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ email, setEmail, password, setPassword, loading, handleLogin, handleSignup }) => (
  <div>
    <input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="Email"
      className="w-full"
    />
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="Password"
      className="w-full mt-2"
    />
    <Button
      onClick={handleLogin}
      className="btn-primary w-full mt-4"
    >
      {loading ? 'Logging in...' : 'Login'}
    </Button>
    <Button
      onClick={handleSignup}
      className="btn-secondary w-full mt-2"
    >
      {loading ? 'Signing up...' : 'Sign Up'}
    </Button>
  </div>
);

export default AuthScreen; 