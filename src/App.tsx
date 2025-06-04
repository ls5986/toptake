import React from 'react';
import { AppProvider } from '@/contexts/AppContext';
import AppLayout from '@/components/AppLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <div className="app-container">
        <AppProvider>
          <AppLayout />
          <Toaster />
        </AppProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;