import React from 'react';
import { Trophy, Home, Star, Search, User } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface MainTabsProps {
  currentTab: 'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions' | 'notifications' | 'search';
  onTabChange: (tab: 'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions' | 'notifications' | 'search') => void;
  showAdmin?: boolean;
  unreadNotifications?: number;
}

const MainTabs: React.FC<MainTabsProps> = ({ currentTab, onTabChange }) => {
  // Desktop-only tab set; Search lives in top-right & bottom nav
  const tabs = [
    { id: 'feed' as const, label: 'Feed', icon: Home, shortLabel: 'Feed' },
    { id: 'toptakes' as const, label: 'Top Takes', icon: Star, shortLabel: 'Top' },
    { id: 'leaderboard' as const, label: 'Streaks', icon: Trophy, shortLabel: 'Streaks' },
    { id: 'profile' as const, label: 'Profile', icon: User, shortLabel: 'Profile' },
  ];

  const visibleIds = tabs.map(t => t.id);
  const safeValue = (visibleIds as string[]).includes(currentTab) ? currentTab : 'feed';

  return (
    <div className="hidden md:block sticky top-0 z-20 bg-brand-surface border-b border-brand-border">
      <Tabs value={safeValue} onValueChange={onTabChange} className="p-2">
        <TabsList className={`grid gap-1 w-full`} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="px-2 py-2 text-[11px] sm:text-sm transition-all duration-200"
              >
                <span className="relative flex items-center">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                </span>
                <span className="ml-1">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default MainTabs;