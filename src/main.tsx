import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { clearInvalidTokens } from '@/lib/supabase';
import '@/lib/console-filter'; // Filter out chrome extension errors

// Clear invalid tokens only in development (prevents accidental sign-outs in production)
if (import.meta.env.MODE === 'development') {
  clearInvalidTokens().catch(console.error);
}

// Global production error logging and crash visibility
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    console.error('[GLOBAL][error]', e?.error || e?.message || e);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[GLOBAL][unhandledrejection]', e?.reason || e);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);