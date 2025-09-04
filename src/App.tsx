import React, { useEffect } from 'react';
import { AppProvider } from '@/contexts/AppContext';
import AppLayout from '@/components/AppLayout';
import { ThemeProvider } from '@/components/theme-provider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/toaster';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import ProfileRoute from '@/pages/ProfileRoute';
import ProfileSelfRoute from '@/pages/ProfileSelfRoute';

function App() {
  // Emergency modal killer to prevent stuck modals
  useEffect(() => {
    const killStuckModals = () => {
      // Find stuck Purchase Options modals specifically
      document.querySelectorAll('[role="dialog"]').forEach(modal => {
        if (modal.textContent?.includes('Purchase Options')) {
          console.log('🚨 Emergency: Killing stuck Purchase Options modal');
          modal.remove();
        }
      });
      
      // Find stuck modals but EXCLUDE legitimate ones like DailyPromptBlocker
      document.querySelectorAll('[data-state="open"]').forEach(modal => {
        if (modal.closest('[role="dialog"]')) {
          const modalContent = modal.textContent || '';
          // Don't kill legitimate modals
          if (modalContent.includes('Today\'s Prompt') || 
              modalContent.includes('Submit your take') ||
              modalContent.includes('DailyPromptBlocker')) {
            return; // Skip legitimate modals
          }
          
          // Only kill modals that have been open for too long (potential stuck modals)
          const modalElement = modal as HTMLElement;
          if (modalElement.dataset.openTime) {
            const openTime = parseInt(modalElement.dataset.openTime);
            const now = Date.now();
            if (now - openTime > 30000) { // 30 seconds
              console.log('🚨 Emergency: Killing stuck modal that has been open too long');
              modal.remove();
            }
          } else {
            // Mark modal with open time
            modalElement.dataset.openTime = Date.now().toString();
          }
        }
      });
      
      // Restore body scroll and pointer events only if no legitimate modals are open
      const hasLegitimateModals = document.querySelectorAll('[data-state="open"]').length > 0;
      if (!hasLegitimateModals) {
        document.body.style.overflow = 'auto';
        document.body.style.pointerEvents = 'auto';
      }
    };
    
    // Global escape key handler
    const handleGlobalEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        killStuckModals();
      }
    };
    
    document.addEventListener('keydown', handleGlobalEscape);
    
    // Auto-kill stuck modals every 10 seconds (less aggressive)
    const interval = setInterval(killStuckModals, 10000);
    
    return () => {
      document.removeEventListener('keydown', handleGlobalEscape);
      clearInterval(interval);
    };
  }, []);

  return (
    <ErrorBoundary>
      <div className="app-container">
        <AppProvider>
          <ThemeProvider>
            <Routes>
              <Route path="/" element={<AppLayout />} />
              <Route path="profile" element={<ProfileSelfRoute />} />
              <Route path=":username" element={<ProfileRoute />} />
            </Routes>
            <Toaster />
          </ThemeProvider>
        </AppProvider>
      </div>
    </ErrorBoundary>
  );
}

export default App;