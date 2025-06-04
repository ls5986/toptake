import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Github, ExternalLink, CheckCircle } from 'lucide-react';

interface GitHubIntegrationProps {
  onConnect?: (repoUrl: string) => void;
}

export const GitHubIntegration: React.FC<GitHubIntegrationProps> = ({ onConnect }) => {
  const [repoUrl, setRepoUrl] = useState('https://github.com/ls5986/toptake.git');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsConnected(true);
      onConnect?.(repoUrl);
    } catch (error) {
      console.error('Failed to connect to GitHub:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const openGitHubInstructions = () => {
    window.open('https://docs.github.com/en/get-started/getting-started-with-git/set-up-git', '_blank');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          GitHub Integration
        </CardTitle>
        <CardDescription>
          Connect your project to GitHub repository for version control and collaboration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="repo-url">Repository URL</Label>
              <Input
                id="repo-url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository.git"
              />
            </div>
            
            <Alert>
              <AlertDescription>
                To connect to GitHub, you'll need to:
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Initialize git in your project: <code className="bg-gray-100 px-1 rounded">git init</code></li>
                  <li>Add your files: <code className="bg-gray-100 px-1 rounded">git add .</code></li>
                  <li>Commit changes: <code className="bg-gray-100 px-1 rounded">git commit -m "Initial commit"</code></li>
                  <li>Add remote: <code className="bg-gray-100 px-1 rounded">git remote add origin {repoUrl}</code></li>
                  <li>Push to GitHub: <code className="bg-gray-100 px-1 rounded">git push -u origin main</code></li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Button 
                onClick={handleConnect} 
                disabled={isConnecting || !repoUrl}
                className="flex-1"
              >
                {isConnecting ? 'Connecting...' : 'Connect to GitHub'}
              </Button>
              <Button 
                variant="outline" 
                onClick={openGitHubInstructions}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Help
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-green-700">Successfully Connected!</h3>
              <p className="text-sm text-gray-600">Your project is now connected to: {repoUrl}</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.open(repoUrl.replace('.git', ''), '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Repository
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};