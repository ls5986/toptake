import React from 'react';
import { useAppContext } from '@/contexts/AppContext';
import PromptCalendar from './PromptCalendar';
import PromptSuggestionInbox from './PromptSuggestionInbox';
import PromptAnalytics from './PromptAnalytics';
import type { User } from '@/types';

const PromptAdminDashboard: React.FC = () => {
  const { user } = useAppContext();
  if (!user?.is_admin) {
    return <div className="text-center text-brand-danger py-8 text-xl font-bold font-sans">Not authorized</div>;
  }
  return (
    <div className="max-w-5xl mx-auto py-8 space-y-8">
      <PromptCalendar />
      <PromptSuggestionInbox />
      <PromptAnalytics />
    </div>
  );
};

export default PromptAdminDashboard; 