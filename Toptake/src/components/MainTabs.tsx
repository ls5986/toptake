import React from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Home, User, Star, Settings, MessageSquare } from 'lucide-react';

interface MainTabsProps {
  currentTab: 'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions';
  onTabChange: (tab: 'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions') => void;
  showAdmin?: boolean;
}

const MainTabs: React.FC<MainTabsProps> = ({ currentTab, onTabChange, showAdmin = false }) => {
  const tabs = [
    { id: 'feed' as const, label: 'Feed', icon: Home, shortLabel: 'Feed' },
    { id: 'toptakes' as const, label: 'Top Takes', icon: Star, shortLabel: 'Top' },
    { id: 'leaderboard' as const, label: 'Streaks', icon: Trophy, shortLabel: 'Streaks' },
    { id: 'suggestions' as const, label: 'Suggest', icon: MessageSquare, shortLabel: 'Suggest' },
    { id: 'profile' as const, label: 'My Takes', icon: User, shortLabel: 'Profile' }
  ];

  if (showAdmin) {
    tabs.push({ id: 'admin' as const, label: 'Admin', icon: Settings, shortLabel: 'Admin' });
  }

  return (
    <div className="sticky top-0 z-20 bg-gray-800/95 backdrop-blur-sm border-b border-gray-700">
      <div className="flex p-2 gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              variant={currentTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              className={`flex-1 min-w-0 px-2 py-2 text-xs sm:text-sm transition-all duration-200 ${
                currentTab === tab.id 
                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="ml-1 truncate hidden xs:inline">{tab.shortLabel}</span>
              <span className="ml-1 truncate xs:hidden">{tab.shortLabel.slice(0, 3)}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default MainTabs;