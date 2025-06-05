import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Users, LogOut, Menu } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { TakeCard } from './TakeCard';
import { AppBlocker } from './AppBlocker';
import { TodaysPrompt } from './TodaysPrompt';
import { Take } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { MonetizationModals } from './MonetizationModals';
import { supabase } from '@/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';
import MainTabs from './MainTabs';
import LeaderboardScreen from './LeaderboardScreen';
import ProfileView from './ProfileView';
import TopTakesScreen from './TopTakesScreen';
import FriendsScreen from './FriendsScreen';
import AdminScreen from './AdminScreen';
import PromptRecommendations from './PromptRecommendations';
import { getTodayPrompt } from '@/lib/supabase';
import BillingModal from './BillingModal';
import AccountSettingsModal from './AccountSettingsModal';

const MainAppScreen: React.FC = () => {
  const { setCurrentScreen, user, currentScreen, checkDailyPost, logout, isAppBlocked, setIsAppBlocked, currentPrompt } = useAppContext();
  const [takes, setTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions'>('feed');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const { toast } = useToast();
  const fetchInProgress = useRef(false);
  const [promptText, setPromptText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);

  if (currentScreen === 'friends') {
    return <FriendsScreen />;
  }

  useEffect(() => {
    if (!user || fetchInProgress.current) return;
    fetchInProgress.current = true;
    console.log('MainAppScreen: initializing screen for user', user.id);
    const initializeScreen = async () => {
      try {
        await checkDailyPost();
        if (user.hasPostedToday) {
          await loadTakes();
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing screen:', error);
        setLoading(false);
      } finally {
        fetchInProgress.current = false;
      }
    };
    initializeScreen();
  }, [user]);

  const loadTakes = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('takes')
        .select('*')
        .eq('prompt_date', today)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Error loading takes:', error);
        loadFakeTakes();
        return;
      }
      const userIds = [...new Set(data.map(take => take.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', userIds);
      const profileMap = profiles?.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>) || {};
      // Fetch all comments for today's takes and count per take
      const takeIds = data.map(take => take.id);
      let commentCountMap: Record<string, number> = {};
      if (takeIds.length > 0) {
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('id, take_id')
          .in('take_id', takeIds);
        if (!commentsError && commentsData) {
          commentCountMap = commentsData.reduce((acc, row) => {
            acc[row.take_id] = (acc[row.take_id] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        }
      }
      const formattedTakes = data.map(take => ({
        id: take.id,
        userId: take.user_id,
        content: take.content,
        username: take.is_anonymous ? 'Anonymous' : profileMap[take.user_id]?.username || 'Unknown',
        isAnonymous: take.is_anonymous,
        reactions: take.reactions || { wildTake: 0, fairPoint: 0, mid: 0, thatYou: 0 },
        commentCount: commentCountMap[take.id] || 0,
        timestamp: take.created_at
      }));
      setTakes(formattedTakes);
    } catch (error) {
      console.error('Error loading takes:', error);
      loadFakeTakes();
    } finally {
      setLoading(false);
    }
  };

  const loadFakeTakes = () => {
    try {
      const stored = localStorage.getItem('fakeTakes');
      if (stored) {
        setTakes(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading fake takes:', error);
    }
    setLoading(false);
  };

  const handleReaction = async (takeId: string, reaction: keyof Take['reactions']) => {
    try {
      if (!user?.hasPostedToday) {
        toast({ title: "🔒 Post today's take first to react!", variant: "destructive" });
        return;
      }
      // Optimistically update UI
      setTakes(prev => prev.map(t => 
        t.id === takeId ? { 
          ...t, 
          reactions: {
            ...t.reactions,
            [reaction]: t.reactions[reaction] + 1
          }
        } : t
      ));
      // Persist to Supabase
      const take = takes.find(t => t.id === takeId);
      if (!take) return;
      const updatedReactions = {
        ...take.reactions,
        [reaction]: take.reactions[reaction] + 1
      };
      await supabase
        .from('takes')
        .update({ reactions: updatedReactions })
        .eq('id', takeId);
    } catch (error) {
      console.error('Error handling reaction:', error);
    }
  };

  const handleUnlock = async () => {
    try {
      setIsAppBlocked(false);
      await checkDailyPost();
      await loadTakes();
    } catch (error) {
      console.error('Error unlocking:', error);
    }
  };

  const handlePurchase = (type: string) => {
    try {
      toast({ title: `${type} purchased!`, description: "Thank you!", duration: 3000 });
    } catch (error) {
      console.error('Error handling purchase:', error);
    }
  };

  const handleTabChange = (tab: 'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions') => {
    try {
      if (tab === 'admin' && user?.username !== 'ljstevens') {
        return;
      }
      setCurrentTab(tab);
    } catch (error) {
      console.error('Error changing tab:', error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const renderContent = () => {
    try {
      if (currentTab === 'admin' && user?.username === 'ljstevens') {
        return <AdminScreen />;
      }
      
      if (currentTab === 'leaderboard') {
        return <LeaderboardScreen />;
      }
      
      if (currentTab === 'profile') {
        return <ProfileView />;
      }

      if (currentTab === 'toptakes') {
        return <TopTakesScreen />;
      }

      if (currentTab === 'suggestions') {
        return (
          <div className="flex-1 p-4">
            <PromptRecommendations />
          </div>
        );
      }

      return (
        <div className="flex-1 flex flex-col h-full">
          <div className="flex-shrink-0">
          <TodaysPrompt prompt={promptText} takeCount={takes.length} loading={loading} />
          </div>
          
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
                  <p>Loading today's takes...</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <h2 className="text-xl font-semibold text-brand-text sticky top-0 bg-brand-surface py-2 z-10">
                    💬 Today's Hot Takes ({takes.length})
                  </h2>
                  {takes.map((take) => (
                    <TakeCard key={take.id} take={take} onReact={handleReaction} />
                  ))}
                  {takes.length === 0 && (
                    <div className="text-center text-brand-muted py-8">
                      <p>No takes yet today!</p>
                      <p className="text-sm mt-2">Be the first to share your take</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error rendering content:', error);
      return <div className="text-white p-4">Error loading content</div>;
    }
  };

  const showAdminTab = user?.username === 'ljstevens';

  useEffect(() => {
    const fetchPrompt = async () => {
      try {
        const { data, error } = await getTodayPrompt();
        if (error) {
          console.error('Error fetching today\'s prompt:', error);
        } else {
          setPromptText(data?.prompt_text || '');
        }
      } catch (error) {
        console.error('Error fetching today\'s prompt:', error);
      }
    };

    fetchPrompt();
  }, []);

  return (
    <div className="bg-brand-background min-h-screen flex flex-col">
      <AppBlocker isBlocked={isAppBlocked} onSubmit={handleUnlock} />
      
      <div className={`flex-1 flex flex-col ${isAppBlocked ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="flex-shrink-0 p-4 border-b border-brand-border">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <button
              className="p-2 rounded hover:bg-brand-surface/80 focus:outline-none"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">🔥 TopTake</h1>
          </div>
        </div>
        
        <div className="flex-shrink-0">
          <div className="max-w-2xl mx-auto">
            <MainTabs currentTab={currentTab} onTabChange={handleTabChange} showAdmin={showAdminTab} />
          </div>
        </div>
        
        <div className="flex-1 min-h-0">
          <div className="max-w-2xl mx-auto h-full">
            {renderContent()}
          </div>
        </div>
      </div>

      <MonetizationModals
        showAnonymousModal={showAnonymousModal}
        showStreakModal={false}
        showPremiumModal={showPremiumModal}
        showBoostModal={false}
        onClose={() => { setShowAnonymousModal(false); setShowPremiumModal(false); }}
        onPurchase={handlePurchase}
      />

      {/* Hamburger menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-brand-background bg-opacity-90 flex">
          <div className="w-64 bg-brand-surface h-full shadow-lg p-6 flex flex-col">
            <button
              className="self-end mb-4 text-brand-muted hover:text-brand-primary"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              ×
            </button>
            <button
              className="mb-4 w-full text-left text-brand-text py-2 px-3 rounded hover:bg-brand-background"
              onClick={() => { setCurrentScreen('friends'); setMenuOpen(false); }}
            >
              Friends
            </button>
            <button
              className="mb-4 w-full text-left text-brand-text py-2 px-3 rounded hover:bg-brand-background"
              onClick={() => { setCurrentTab('suggestions'); setMenuOpen(false); }}
            >
              Suggestions
            </button>
            <button
              className="mb-4 w-full text-left text-brand-text py-2 px-3 rounded hover:bg-brand-background"
              onClick={() => { setShowBillingModal(true); setMenuOpen(false); }}
            >
              Billing
            </button>
            <button
              className="mb-4 w-full text-left text-brand-text py-2 px-3 rounded hover:bg-brand-background"
              onClick={() => { setShowAccountSettingsModal(true); setMenuOpen(false); }}
            >
              Account Settings
            </button>
            <button
              className="mb-4 w-full text-left text-brand-danger py-2 px-3 rounded hover:bg-brand-danger hover:text-brand-text"
              onClick={() => { setShowAccountSettingsModal(true); setMenuOpen(false); }}
            >
              Delete Account
            </button>
            <button
              className="mt-auto w-full text-left text-brand-danger py-2 px-3 rounded hover:bg-brand-danger hover:text-brand-text"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Modals for Billing and Account Settings */}
      {showBillingModal && (
        <BillingModal isOpen={showBillingModal} onClose={() => setShowBillingModal(false)} />
      )}
      {showAccountSettingsModal && (
        <AccountSettingsModal isOpen={showAccountSettingsModal} onClose={() => setShowAccountSettingsModal(false)} />
      )}
    </div>
  );
};

export default MainAppScreen;