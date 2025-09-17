import React from 'react';
import { Home, Search, Bell, Star, User, PlusCircle } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions' | 'notifications' | 'search';
  onTabChange: (tab: 'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions' | 'notifications' | 'search') => void;
  unreadNotifications?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, unreadNotifications = 0 }) => {
  const itemCls = (active: boolean) => `flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] ${active ? 'text-brand-text' : 'text-brand-muted'}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-brand-surface/95 backdrop-blur-sm border-t border-brand-border safe-pb">
      <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto grid grid-cols-5">
        <button className={itemCls(currentTab==='feed')} onClick={()=>onTabChange('feed')} aria-label="Feed">
          <Home className="w-5 h-5" />
          <span>Feed</span>
        </button>
        <button className={itemCls(currentTab==='search')} onClick={()=>onTabChange('search')} aria-label="Search">
          <Search className="w-5 h-5" />
          <span>Search</span>
        </button>
        <button className="flex items-center justify-center py-1" onClick={()=>onTabChange('feed')} aria-label="Compose">
          <div className="px-4 py-1.5 rounded-full bg-brand-accent text-white shadow-brand-elev-2 flex items-center gap-1">
            <PlusCircle className="w-5 h-5" />
            <span className="text-[12px] font-semibold">Compose</span>
          </div>
        </button>
        <button className={itemCls(currentTab==='notifications')} onClick={()=>onTabChange('notifications')} aria-label="Notifications">
          <div className="relative">
            <Bell className="w-5 h-5" />
            {unreadNotifications>0 && (
              <span className="absolute -top-1 -right-2 bg-brand-accent text-white rounded-full text-[10px] px-1.5 py-0.5 leading-none">{unreadNotifications>9?'9+':unreadNotifications}</span>
            )}
          </div>
          <span>Alerts</span>
        </button>
        <button className={itemCls(currentTab==='profile')} onClick={()=>onTabChange('profile')} aria-label="Profile">
          <User className="w-5 h-5" />
          <span>Profile</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;


