import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Users, LogOut, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
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
import NotificationsScreen from './NotificationsScreen';
import LateSubmitModal from './LateSubmitModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useTodayPrompt } from '@/hooks/useTodayPrompt';
import { usePromptForDate } from '@/hooks/usePromptForDate';

const MainAppScreen: React.FC = () => {
  const { setCurrentScreen, user, currentScreen, checkDailyPost, logout, isAppBlocked, setIsAppBlocked, currentPrompt } = useAppContext();
  const [takes, setTakes] = useState<Take[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState<'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions' | 'notifications'>('feed');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const { toast } = useToast();
  const fetchInProgress = useRef(false);
  const [promptText, setPromptText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [focusedTakeId, setFocusedTakeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return today;
  });
  const [showLateSubmit, setShowLateSubmit] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = new Date();
  const [hasPostedForSelectedDate, setHasPostedForSelectedDate] = useState(false);
  const { prompt, loading: promptLoading, error, hasPostedToday } = useTodayPrompt();
  const { promptText: promptTextForDate, loading: promptLoadingForDate } = usePromptForDate(selectedDate);

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
  }, [user, checkDailyPost]);

  const loadTakes = React.useCallback(async () => {
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
      const profileMap: Record<string, { id: string; username: string }> = profiles?.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, { id: string; username: string }>) || {};
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
  }, []);

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
      // Persist to Supabase
      await supabase.from('take_reactions').upsert({
        take_id: takeId,
        actor_id: user.id,
        reaction_type: reaction,
        created_at: new Date().toISOString(),
      });
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

  const handleTabChange = (tab: typeof currentTab) => {
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

  const updateUnreadNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', user.id)
      .eq('read', false);
    if (!error && data) setUnreadNotifications(data.length);
  };

  const handleGoToTake = (takeid: string) => {
    setCurrentTab('toptakes');
    setFocusedTakeId(takeid);
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
        return <TopTakesScreen focusedTakeId={focusedTakeId} />;
      }

      if (currentTab === 'suggestions') {
        return (
          <div className="flex-1 p-4">
            <PromptRecommendations />
          </div>
        );
      }

      if (currentTab === 'notifications') {
        return <NotificationsScreen />;
      }

      return (
        <div className="flex-1 flex flex-col h-full">
          <div className="flex-shrink-0">
          <TodaysPrompt prompt={promptTextForDate} takeCount={takes.length} loading={loading} />
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

  useEffect(() => {
    if (!user) return;
    // Fetch unread notifications count
    const fetchUnread = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', user.id)
        .eq('read', false);
      if (!error && data) setUnreadNotifications(data.length);
    };
    fetchUnread();
  }, [user]);

  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
    const msToMidnight = midnight.getTime() - now.getTime();
    const timer = setTimeout(() => window.location.reload(), msToMidnight);
    return () => clearTimeout(timer);
  }, []);

  const goToPrevDay = () => setSelectedDate(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() - 1);
    return d;
  });
  const goToNextDay = () => setSelectedDate(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() + 1);
    if (d > today) return prev;
    return d;
  });

  // Helper to format date as yyyy-MM-dd
  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  // Fetch prompt and takes for selectedDate
  const fetchPromptAndTakesForDate = async (date: Date) => {
    setLoading(true);
    try {
      // Fetch prompt for selectedDate
      const { data: promptData, error } = await supabase
        .from('daily_prompts')
        .select('id, prompt_text')
        .eq('prompt_date', formatDate(date))
        .single();
      setPromptText(promptData?.prompt_text || '');
      // Fetch takes for selectedDate
      const { data: takesData, error: takesError } = await supabase
        .from('takes')
        .select('*')
        .eq('prompt_date', formatDate(date))
        .order('created_at', { ascending: false });
      // Fetch profiles for user_ids
      const userIds = [...new Set((takesData || []).map(t => t.user_id).filter(Boolean))];
      let profileMap: Record<string, { id: string; username: string }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        profileMap = (profiles || []).reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, { id: string; username: string }>);
      }
      // Fetch all comments for takes and count per take
      const takeIds = (takesData || []).map((take: { id: string }) => take.id);
      let commentCountMap: Record<string, number> = {};
      if (takeIds.length > 0) {
        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select('id, take_id')
          .in('take_id', takeIds);
        if (!commentsError && commentsData) {
          commentCountMap = commentsData.reduce((acc: Record<string, number>, row: { take_id: string }) => {
            acc[row.take_id] = (acc[row.take_id] || 0) + 1;
            return acc;
          }, {});
        }
      }
      const formattedTakes = (takesData || []).map(take => ({
        id: take.id,
        userId: take.user_id,
        content: take.content,
        username: take.is_anonymous ? 'Anonymous' : profileMap[take.user_id]?.username || 'Unknown',
        isAnonymous: take.is_anonymous,
        commentCount: commentCountMap[take.id] || 0,
        timestamp: take.created_at
      }));
      setTakes(formattedTakes);
    } catch (error) {
      setPromptText('');
      setTakes([]);
    } finally {
      setLoading(false);
    }
  };

  // Watch selectedDate and currentTab, fetch for date if feed or toptakes
  useEffect(() => {
    if (currentTab === 'feed' || currentTab === 'toptakes') {
      fetchPromptAndTakesForDate(selectedDate);
    }
    // eslint-disable-next-line
  }, [selectedDate, currentTab]);

  const checkHasPostedForDate = async (date: Date) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('takes')
      .select('id')
      .eq('user_id', user.id)
      .eq('prompt_date', formatDate(date))
      .single();
    setHasPostedForSelectedDate(!!data);
  };

  // Watch selectedDate and user, check if posted
  useEffect(() => {
    if (user) checkHasPostedForDate(selectedDate);
    // eslint-disable-next-line
  }, [selectedDate, user]);

  // Show late submit modal if not posted, not today
  useEffect(() => {
    const isToday = formatDate(selectedDate) === formatDate(today);
    if (!hasPostedForSelectedDate && !isToday) {
      setShowLateSubmit(true);
    } else {
      setShowLateSubmit(false);
    }
  }, [hasPostedForSelectedDate, selectedDate, today]);

  const checkLateSubmissionEligibility = async (date: Date) => {
    if (!user) return false;

    try {
      // Convert date to user's timezone
      const userDate = new Date(date.getTime() + (user.timezone_offset * 60000));
      const promptDate = userDate.toISOString().split('T')[0];

      // Check if user has already submitted for this date
      const { data: existingTake } = await supabase
        .from('takes')
        .select('id')
        .eq('user_id', user.id)
        .eq('prompt_date', promptDate)
        .single();

      if (existingTake) {
        setHasPostedForSelectedDate(true);
        return false;
      }

      // Check if user has already paid for late submission
      const { data: hasPaid } = await supabase
        .rpc('has_paid_late_submission', {
          user_id: user.id,
          prompt_date: promptDate
        });

      if (hasPaid) {
        setHasPostedForSelectedDate(false);
        return true;
      }

      // Check if prompt exists for this date
      const { data: prompt } = await supabase
        .from('daily_prompts')
        .select('id')
        .eq('prompt_date', promptDate)
        .single();

      if (!prompt) {
        toast({ 
          title: "No prompt found", 
          description: "There was no prompt for this date.",
          variant: "destructive" 
        });
        return false;
      }

      setHasPostedForSelectedDate(false);
      return true;
    } catch (error) {
      console.error('Error checking late submission eligibility:', error);
      return false;
    }
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    const isEligible = await checkLateSubmissionEligibility(date);
    if (isEligible) {
      setShowLateSubmit(true);
    }
  };

  if (currentScreen === 'friends') {
    return <FriendsScreen />;
  }

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
            <MainTabs currentTab={currentTab} onTabChange={handleTabChange} showAdmin={showAdminTab} unreadNotifications={unreadNotifications} />
          </div>
        </div>
        
        <div className="flex-1 min-h-0">
          <div className="max-w-2xl mx-auto h-full">
            <div className="flex items-center justify-center gap-4 my-4">
              <Button variant="ghost" onClick={goToPrevDay}><ChevronLeft /></Button>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="font-semibold text-lg px-4" onClick={() => setCalendarOpen(true)}>
                    {selectedDate.toLocaleDateString()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="center" className="bg-brand-surface border-brand-border p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    toDate={today}
                  />
                </PopoverContent>
              </Popover>
              <Button variant="ghost" onClick={goToNextDay} disabled={selectedDate.getTime() === today.getTime()}><ChevronRight /></Button>
            </div>
            {renderContent()}
          </div>
        </div>
      </div>

      {(showAnonymousModal || showPremiumModal) && (
        <MonetizationModals
          onClose={() => { 
            setShowAnonymousModal(false); 
            setShowPremiumModal(false); 
          }}
          onSuccess={() => {
            setShowAnonymousModal(false);
            setShowPremiumModal(false);
            // Refresh user credits after purchase
            window.location.reload();
          }}
        />
      )}

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

      {showLateSubmit && (
        <LateSubmitModal
          isOpen={showLateSubmit}
          onClose={() => setShowLateSubmit(false)}
          onPurchase={() => {/* billing/credit logic here */}}
          date={selectedDate}
        />
      )}
    </div>
  );
};

export default MainAppScreen;