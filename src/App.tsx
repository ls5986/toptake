import React, { useEffect } from 'react';
import { AppProvider } from '@/contexts/AppContext';
import AppLayout from '@/components/AppLayout';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import './App.css';

function App() {
  // Emergency modal killer to prevent stuck modals
  useEffect(() => {
    const killStuckModals = () => {
      // Find stuck Purchase Options modals
      document.querySelectorAll('[role="dialog"]').forEach(modal => {
        if (modal.textContent?.includes('Purchase Options')) {
          console.log('🚨 Emergency: Killing stuck Purchase Options modal');
          modal.remove();
        }
      });
      
      // Find any other stuck modals
      document.querySelectorAll('[data-state="open"]').forEach(modal => {
        if (modal.closest('[role="dialog"]')) {
          console.log('🚨 Emergency: Killing stuck modal');
          modal.remove();
        }
      });
      
      // Restore body scroll and pointer events
      document.body.style.overflow = 'auto';
      document.body.style.pointerEvents = 'auto';
    };
    
    // Global escape key handler
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        killStuckModals();
      }
    };
    
    document.addEventListener('keydown', handleGlobalEscape);
    
    // Auto-kill stuck modals every 5 seconds
    const interval = setInterval(killStuckModals, 5000);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalEscape);
      clearInterval(interval);
    };
  }, []);

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