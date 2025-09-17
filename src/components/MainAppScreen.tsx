import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, LogOut, Menu, ChevronLeft, ChevronRight, Search } from 'lucide-react';
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
import BottomNav from './BottomNav';
import LeaderboardScreen from './LeaderboardScreen';
import ProfileView from './ProfileView';
import ProfileRoute from '@/pages/ProfileRoute';
import TopTakesScreen from './TopTakesScreen';
import FriendsScreen from './FriendsScreen';
import AdminScreen from './AdminScreen';
import PromptRecommendations from './PromptRecommendations';
import { getTodayPrompt } from '@/lib/supabase';
import { fetchPromptForDateCached } from '@/lib/utils';
import BillingModal from './BillingModal';
import AccountSettingsModal from './AccountSettingsModal';
import NotificationsScreen from './NotificationsScreen';
import SearchScreen from './SearchScreen';
import LateSubmitModal from './LateSubmitModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useTodayPrompt } from '@/hooks/useTodayPrompt';
import { useTakesForDate } from '@/hooks/useTakesForDate';
import { fetchUnreadCount, subscribeNotifications } from '@/lib/notifications';

const MainAppScreen: React.FC = () => {
  const { setCurrentScreen, user, currentScreen, checkDailyPost, logout, isAppBlocked, setIsAppBlocked, currentPrompt, hasPostedToday } = useAppContext();
  const { username } = useParams();
  const navigate = useNavigate();
  // Remove local duplicated takes/loading; rely on hook state
  const [currentTab, setCurrentTab] = useState<'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions' | 'notifications' | 'search'>('feed');
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
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  }, []);
  const [hasPostedForSelectedDate, setHasPostedForSelectedDate] = useState(false);
  const { prompt, loading: promptLoading, error } = useTodayPrompt();
  const { takes: sharedTakes, loading: sharedLoading } = useTakesForDate(selectedDate);

  useEffect(() => {
    if (!user || fetchInProgress.current) return;
    fetchInProgress.current = true;
    console.log('MainAppScreen: initializing screen for user', user.id);
    const initializeScreen = async () => {
      try {
        await checkDailyPost();
        // If returning from Stripe, resume late submit for the stored date
        try {
          const pending = localStorage.getItem('pendingLateSubmitFor');
          const ts = Number(localStorage.getItem('pendingLateSubmitTS') || 0);
          const isFresh = ts && (Date.now() - ts < 10 * 60 * 1000); // 10 min
          if (pending && isFresh) {
            const [y,m,d] = pending.split('-').map(n=>Number(n));
            const resumeDate = new Date(y, (m||1)-1, d||1);
            setSelectedDate(resumeDate);
            const eligible = await checkLateSubmissionEligibility(resumeDate);
            setShowLateSubmit(eligible);
            // one-shot
            localStorage.removeItem('pendingLateSubmitFor');
            localStorage.removeItem('pendingLateSubmitTS');
          }
        } catch {}
        // Ensure prompt + takes for selectedDate are fetched immediately on app open
        if (currentTab === 'feed') {
          console.log('[init] fetching prompt/takes for date on mount', { date: selectedDate.toISOString().split('T')[0] });
          await fetchPromptAndTakesForDate(selectedDate);
        }
      } catch (error) {
        console.error('Error initializing screen:', error);
        // no-op; hook drives loading
      } finally {
        fetchInProgress.current = false;
      }
    };
    initializeScreen();
  }, [user, checkDailyPost]);

  // If we are on /:username, keep the Profile tab visually active
  useEffect(() => {
    if (username) setCurrentTab('profile');
  }, [username]);

  // Removed loadTakes; use hook values directly

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
      if (tab === 'admin' && !user?.is_admin) {
        return;
      }
      // If we are on a /:username route, clear it for any non-profile tabs
      if (tab !== 'profile' && username) {
        navigate('/');
      }
      // search opens inline SearchScreen tab
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
      // If route contains a username, render that profile inside the main layout
      if (username) {
        return (
          <div className="flex-1 p-0">
            <ProfileRoute />
          </div>
        );
      }
      if (currentTab === 'admin' && user?.is_admin) {
        return <AdminScreen />;
      }
      
      if (currentTab === 'leaderboard') {
        return <LeaderboardScreen />;
      }
      
      if (currentTab === 'profile') {
        return <ProfileView />;
      }

      if (currentTab === 'toptakes') {
        return <TopTakesScreen focusedTakeId={focusedTakeId} selectedDate={selectedDate} onDateChange={setSelectedDate} />;
      }

      if (currentTab === 'search') {
        return <SearchScreen onGoToTake={handleGoToTake} />;
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
          <TodaysPrompt 
            prompt={promptText} 
            takeCount={(sharedTakes as any)?.length || 0} 
            loading={!promptText && sharedLoading}
          />
          </div>
          
          <div className="flex-1 min-h-0">
            { (sharedLoading) ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-brand-text">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-4"></div>
                  <p>Loading today's takes...</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  <h2 className="text-xl font-semibold text-brand-text sticky top-0 bg-brand-surface py-2 z-10">
                    💬 Today's Hot Takes ({(sharedTakes as any)?.length || 0})
                  </h2>
                  {(sharedTakes as any)?.map((take: any) => (
                    <TakeCard key={take.id} take={take} onReact={handleReaction} />
                  ))}
                  {(!(sharedTakes as any)?.length) && (
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

  const showAdminTab = !!user?.is_admin;

  // Removed redundant today-prompt effect; header prompt now follows selectedDate

  useEffect(() => {
    if (!user) return;
    let unsubscribe: (() => void) | null = null;

    const loadUnread = async () => {
      try {
        const count = await fetchUnreadCount(user.id);
        setUnreadNotifications(count);
      } catch {}
    };

    loadUnread();
    unsubscribe = subscribeNotifications(user.id, () => {
      // Increment optimistically; a more robust approach would refetch
      setUnreadNotifications(prev => prev + 1);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.id]);

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

  // Helper to format date as yyyy-MM-dd (LOCAL timezone)
  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Quick date helpers for chip row
  const dateNDaysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };
  const isSameYMD = (a: Date, b: Date) => formatDate(a) === formatDate(b);

  // Fetch prompt and takes for selectedDate
  const fetchPromptAndTakesForDate = async (date: Date) => {
    try {
      const dateStr = formatDate(date);
      const cachedPrompt = await fetchPromptForDateCached(dateStr);
      console.log('[fetchPromptAndTakesForDate] prompt', { dateStr, cached: !!cachedPrompt });
      setPromptText(cachedPrompt || '');
    } catch (error) {
      console.error('[fetchPromptAndTakesForDate] failed', { date: formatDate(date), error });
      setPromptText('');
    }
  };

  // Belt-and-suspenders: on first mount, trigger a fetch for feed if promptText is empty
  useEffect(() => {
    if (currentTab === 'feed' && !promptText) {
      console.log('[mount] prompt empty, fetching for date', { date: formatDate(selectedDate) });
      fetchPromptAndTakesForDate(selectedDate);
    }
    // eslint-disable-next-line
  }, []);

  // If hook provided a prompt, adopt it as a fallback source
  useEffect(() => {
    // Coerce hook prompt to string; avoid rendering object (React error #31)
    if (currentTab === 'feed' && !promptText && prompt) {
      const text = typeof prompt === 'string' ? prompt : (prompt as any)?.prompt_text || '';
      if (text) {
        console.log('[hook] useTodayPrompt delivered prompt; adopting');
        setPromptText(text);
      }
    }
  }, [prompt, currentTab, promptText]);

  // Check posted for selected date using LOCAL date
  const checkHasPostedForDate = async (date: Date) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('takes')
      .select('id')
      .eq('user_id', user.id)
      .eq('prompt_date', formatDate(date))
      .limit(1);
    setHasPostedForSelectedDate(Array.isArray(data) && data.length > 0);
  };

  // Watch selectedDate and user, check if posted
  useEffect(() => {
    if (user) checkHasPostedForDate(selectedDate);
    // eslint-disable-next-line
  }, [selectedDate, user]);

  // Show late submit modal only if not posted, not today, and eligible
  useEffect(() => {
    const run = async () => {
      const isToday = formatDate(selectedDate) === formatDate(today);
      const forced = (() => { try { return localStorage.getItem('forceBlockerDate'); } catch { return null; } })();
      const isForcedForThisDate = forced && forced === formatDate(selectedDate);
      if (!isToday && !isForcedForThisDate && !isAppBlocked) {
        // Double-check with eligibility (handles prompt existence and prior payment)
        const eligible = await checkLateSubmissionEligibility(selectedDate);
        setShowLateSubmit(!hasPostedForSelectedDate && eligible);
      } else {
        setShowLateSubmit(false);
      }
    };
    run();
    // eslint-disable-next-line
  }, [hasPostedForSelectedDate, selectedDate, today, isAppBlocked]);

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
        .maybeSingle();

      if (existingTake) {
        setHasPostedForSelectedDate(true);
        return false;
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

      // Even if not pre-paid, user can open modal to use/purchase a credit
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

  // Friends overlay removed; search is now a dedicated tab

  return (
    <div className="bg-brand-background min-h-screen flex flex-col">
      <AppBlocker 
        isBlocked={isAppBlocked} 
        onSubmit={handleUnlock}
        targetDate={showLateSubmit ? selectedDate : undefined}
      />
      
      <div className={`flex-1 flex flex-col ${isAppBlocked ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="flex-shrink-0 border-b border-brand-border safe-topbar">
          <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto flex justify-between items-center safe-px py-3">
            <button
              className="p-2 rounded hover:bg-brand-surface/80 focus:outline-none active:opacity-80 touch-target"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-brand-text" />
            </button>
            <h1 className="text-2xl font-bold text-brand-text">🔥 TopTake</h1>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded hover:bg-brand-surface/80" onClick={()=>handleTabChange('search')} aria-label="Search">
                <Search className="w-5 h-5 text-brand-text" />
              </button>
              <button className="p-2 rounded hover:bg-brand-surface/80 relative" onClick={()=>handleTabChange('notifications')} aria-label="Notifications">
                <Users className="w-5 h-5 text-brand-text" />
                {unreadNotifications>0 && <span className="absolute -top-1 -right-1 bg-brand-accent text-white rounded-full text-[10px] px-1 leading-none">{unreadNotifications>9?'9+':unreadNotifications}</span>}
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex-shrink-0 safe-px">
          <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto">
            <MainTabs currentTab={currentTab} onTabChange={(tab)=>{
              if (tab === 'feed') {
                navigate('/');
                setCurrentTab('feed');
                return;
              }
              if (tab === 'profile') {
                navigate('/profile');
                setCurrentTab('profile');
                return;
              }
              handleTabChange(tab);
            }} showAdmin={showAdminTab} unreadNotifications={unreadNotifications} />
          </div>
        </div>
        
        <div className="flex-1 min-h-0">
          <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto h-full">
            {/* Date chip row (Feed & TopTakes) */}
            <div className="flex items-center justify-between my-3 px-2" style={{ display: (username || (currentTab !== 'feed' && currentTab !== 'toptakes')) ? 'none' : undefined }}>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {/* Today chip */}
                <Button
                  variant="outline"
                  className={`${isSameYMD(selectedDate, today) ? 'bg-brand-primary text-white border-brand-primary' : ''} px-3 py-1 rounded-full text-sm`}
                  aria-pressed={isSameYMD(selectedDate, today)}
                  onClick={() => handleDateSelect(today)}
                >
                  Today
                </Button>
                {/* -1 chip */}
                <Button
                  variant="outline"
                  className={`${isSameYMD(selectedDate, dateNDaysAgo(1)) ? 'bg-brand-primary text-white border-brand-primary' : ''} px-3 py-1 rounded-full text-sm`}
                  aria-pressed={isSameYMD(selectedDate, dateNDaysAgo(1))}
                  onClick={() => handleDateSelect(dateNDaysAgo(1))}
                >
                  -1
                </Button>
                {/* -2 chip */}
                <Button
                  variant="outline"
                  className={`${isSameYMD(selectedDate, dateNDaysAgo(2)) ? 'bg-brand-primary text-white border-brand-primary' : ''} px-3 py-1 rounded-full text-sm`}
                  aria-pressed={isSameYMD(selectedDate, dateNDaysAgo(2))}
                  onClick={() => handleDateSelect(dateNDaysAgo(2))}
                >
                  -2
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={goToPrevDay} aria-label="Previous day">
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="px-3 py-1 rounded-full text-sm" onClick={() => setCalendarOpen(true)}>
                      {selectedDate.toLocaleDateString()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="bg-brand-surface border-brand-border p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      initialFocus
                      toDate={today}
                    />
                  </PopoverContent>
                </Popover>
                <Button variant="ghost" size="icon" onClick={goToNextDay} disabled={selectedDate.getTime() === today.getTime()} aria-label="Next day">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
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
        <div className="fixed inset-0 z-50 bg-brand-background/80 backdrop-blur-sm flex" onClick={() => setMenuOpen(false)}>
          <div className="w-64 sm:w-72 bg-brand-surface h-full shadow-lg p-6 flex flex-col safe-panel-padding" onClick={(e)=>e.stopPropagation()}>
            <button
              className="self-end mb-4 text-brand-muted hover:text-brand-primary"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              ×
            </button>
            <button
              className="mb-4 w-full text-left text-brand-text py-2 px-3 rounded hover:bg-brand-background"
              onClick={() => { navigate('/profile'); setCurrentTab('profile'); setMenuOpen(false); }}
            >
              Profile
            </button>
            <button
              className="mb-4 w-full text-left text-brand-text py-2 px-3 rounded hover:bg-brand-background"
              onClick={() => { setCurrentTab('search'); setMenuOpen(false); }}
            >
              Search
            </button>
            <button
              className="mb-4 w-full text-left text-brand-text py-2 px-3 rounded hover:bg-brand-background"
              onClick={() => { setCurrentTab('suggestions'); setMenuOpen(false); }}
            >
              Suggestions
            </button>
            <button
              className="mb-4 w-full text-left text-brand-text py-2 px-3 rounded hover:bg-brand-background"
              onClick={() => { setCurrentTab('notifications'); setMenuOpen(false); }}
            >
              Notifications
            </button>
            {user?.is_admin && (
              <button
                className="mb-4 w-full text-left text-brand-text py-2 px-3 rounded hover:bg-brand-background"
                onClick={() => { setCurrentTab('admin'); setMenuOpen(false); }}
              >
                Admin
              </button>
            )}
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
            {/* Delete account entry removed from quick menu to reduce accidental access */}
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
          onClose={() => { setShowLateSubmit(false); setSelectedDate(today); }}
          onPurchase={() => {/* billing/credit logic here */}}
          date={selectedDate}
        />
      )}

      {/* Bottom navigation (mobile-first) */}
      <div className="md:hidden h-14" />
      <BottomNav currentTab={currentTab} onTabChange={(tab)=>{
        if (tab==='feed') navigate('/');
        if (tab==='profile') navigate('/profile');
        setCurrentTab(tab);
      }} unreadNotifications={unreadNotifications} />
    </div>
  );
};

export default MainAppScreen;