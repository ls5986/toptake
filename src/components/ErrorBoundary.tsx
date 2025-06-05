import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-brand-surface border-brand-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-brand-danger">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-brand-muted text-center">
                An error occurred while loading the application.
              </p>
              {this.state.error && (
                <div className="bg-brand-background p-3 rounded text-sm text-brand-muted">
                  <strong>Error:</strong> {this.state.error.message}
                </div>
              )}
              <div className="flex space-x-2">
                <Button 
                  onClick={() => window.location.reload()} 
                  className="btn-primary flex-1"
                >
                  Refresh Page
                </Button>
                <Button 
                  onClick={() => this.setState({ hasError: false })} 
                  className="btn-secondary flex-1"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;