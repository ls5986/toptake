import React from 'react';
import { Home, Search, Bell, Star, User } from 'lucide-react';

interface BottomNavProps {
  currentTab: 'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions' | 'notifications' | 'search' | 'messages';
  onTabChange: (tab: 'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions' | 'notifications' | 'search' | 'messages') => void;
  unreadNotifications?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, unreadNotifications = 0 }) => {
  const itemCls = (active: boolean) => `h-full w-full flex flex-col items-center justify-center gap-1 text-[11px] select-none ${active ? 'text-brand-text' : 'text-brand-muted'}`;

  return (
    <nav className="relative z-20 flex-shrink-0 bg-brand-surface border-t border-brand-border w-full h-14">
      <div className="w-full h-full grid grid-cols-5">
        <button className={itemCls(currentTab==='feed')} onClick={()=>onTabChange('feed')} aria-label="Feed">
          <Home className="w-5 h-5" />
          <span>Feed</span>
        </button>
        <button className={itemCls(currentTab==='search')} onClick={()=>onTabChange('search')} aria-label="Search">
          <Search className="w-5 h-5" />
          <span>Search</span>
        </button>
        <button className={itemCls(currentTab==='toptakes')} onClick={()=>onTabChange('toptakes')} aria-label="Top Takes">
          <Star className="w-5 h-5" />
          <span>Top</span>
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


