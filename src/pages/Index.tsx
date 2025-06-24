import React from 'react';
import AppLayout from '@/components/AppLayout';
import { AppProvider } from '@/contexts/AppContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useTodayPrompt } from '@/hooks/useTodayPrompt';

const Index: React.FC = () => {
  const { prompt, loading, error, hasPostedToday } = useTodayPrompt();

  return (
    <ErrorBoundary>
      <AppProvider>
        <AppLayout />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default Index;
