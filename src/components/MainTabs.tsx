import React from 'react';
import { Button } from '@/components/ui/button';
import { Trophy, Home, User, Star, Settings, MessageSquare, Bell } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface MainTabsProps {
  currentTab: 'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions' | 'notifications';
  onTabChange: (tab: 'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions' | 'notifications') => void;
  showAdmin?: boolean;
  unreadNotifications?: number;
}

const MainTabs: React.FC<MainTabsProps> = ({ currentTab, onTabChange, showAdmin = false, unreadNotifications = 0 }) => {
  const tabs = [
    { id: 'feed' as const, label: 'Feed', icon: Home, shortLabel: 'Feed' },
    { id: 'toptakes' as const, label: 'Top Takes', icon: Star, shortLabel: 'Top' },
    { id: 'leaderboard' as const, label: 'Streaks', icon: Trophy, shortLabel: 'Streaks' },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell, shortLabel: 'Notif' },
    { id: 'suggestions' as const, label: 'Suggest', icon: MessageSquare, shortLabel: 'Suggest' },
    { id: 'profile' as const, label: 'My Takes', icon: User, shortLabel: 'Profile' }
  ];

  if (showAdmin) {
    tabs.push({ id: 'admin' as const, label: 'Admin', icon: Settings, shortLabel: 'Admin' });
  }

  return (
    <div className="sticky top-0 z-20 bg-brand-surface/95 backdrop-blur-sm border-b border-brand-border">
      <Tabs value={currentTab} onValueChange={onTabChange} className="flex p-2 gap-1">
        <TabsList className="flex-1 min-w-0">
          {tabs.filter(tab => showAdmin || tab.id !== 'admin').map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex-1 min-w-0 px-2 py-2 text-xs sm:text-sm transition-all duration-200"
              >
                <span className="relative flex items-center">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {tab.id === 'notifications' && unreadNotifications > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-brand-danger text-xs px-1 py-0.5">{unreadNotifications}</Badge>
                  )}
                </span>
                <span className="ml-1 truncate hidden xs:inline">{tab.shortLabel}</span>
                <span className="ml-1 truncate xs:hidden">{tab.shortLabel.slice(0, 3)}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
};

export default MainTabs;