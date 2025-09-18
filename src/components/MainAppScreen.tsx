import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Menu, MessageSquareText } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { TakeCard } from './TakeCard';
import { AppBlocker } from './AppBlocker';
import { TodaysPrompt } from './TodaysPrompt';
import { Take } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { MonetizationModals } from './MonetizationModals';
import { supabase } from '@/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  const [currentTab, setCurrentTab] = useState<'feed' | 'leaderboard' | 'profile' | 'toptakes' | 'admin' | 'suggestions' | 'notifications' | 'search' | 'messages'>('feed');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAnonymousModal, setShowAnonymousModal] = useState(false);
  const { toast } = useToast();
  const fetchInProgress = useRef(false);
  const [promptText, setPromptText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showAccountSettingsModal, setShowAccountSettingsModal] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [focusedTakeId, setFocusedTakeId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return today;
  });
  const [showLateSubmit, setShowLateSubmit] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [answeredDates, setAnsweredDates] = useState<Date[]>([]);
  const [missedDates, setMissedDates] = useState<Date[]>([]);
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
          // Late submit via URL param (?late=YYYY-MM-DD)
          try {
            const params = new URLSearchParams(window.location.search);
            const late = params.get('late');
            if (late) {
              const [y,m,d] = late.split('-').map(n=>Number(n));
              const resumeDate = new Date(y, (m||1)-1, d||1);
              setSelectedDate(resumeDate);
              const eligible = await checkLateSubmissionEligibility(resumeDate);
              setShowLateSubmit(eligible);
              // clean param
              params.delete('late');
              const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
              window.history.replaceState({}, '', newUrl);
            }
          } catch {}
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

      if (currentTab === 'messages') {
        const MessagesInbox = require('./MessagesInbox').default;
        const ChatThread = require('./ChatThread').default;
        const chatId = focusedTakeId;
        if (chatId) {
          return <ChatThread threadId={chatId} onBack={()=> setFocusedTakeId(null)} />
        }
        return <MessagesInbox onOpenThread={(id: string)=> setFocusedTakeId(id)} />
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
                <div className="p-3 space-y-3">
                  <div className="text-[11px] uppercase tracking-wide text-brand-muted flex items-center gap-1">
                    <span className="inline-block align-middle">💬</span>
                    <span>Today’s takes</span>
                    <span className="text-brand-text/80 ml-1">{(sharedTakes as any)?.length || 0}</span>
                  </div>
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

    // naive unread message count: messages newer than last_read_at
    const pollUnread = async () => {
      try {
        const { data: parts } = await supabase
          .from('chat_participants')
          .select('thread_id,last_read_at')
          .eq('user_id', user.id);
        const ids = (parts || []).map((p:any)=> p.thread_id);
        if (!ids.length) { setUnreadMessages(0); return; }
        // count messages newer than last_read per thread
        let total = 0;
        for (const p of (parts || []) as any[]) {
          const { data: msgs } = await supabase
            .from('chat_messages')
            .select('id, created_at')
            .eq('thread_id', p.thread_id)
            .gt('created_at', p.last_read_at || '1970-01-01')
            .limit(1);
          if ((msgs || []).length) total += 1; // indicator per-thread
        }
        setUnreadMessages(total);
      } catch {}
    };
    pollUnread();
    const interval = setInterval(pollUnread, 7000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
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

  // Load answered/missed markers for the visible month
  const loadMonthStatus = async (month: Date) => {
    if (!user) return;
    try {
      const start = new Date(month.getFullYear(), month.getMonth(), 1);
      const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
      // Do not mark future days
      const clampedEnd = end > today ? new Date(today) : end;

      const startStr = formatDate(start);
      const endStr = formatDate(clampedEnd);

      // Fetch all prompts for this month
      const [{ data: prompts }, { data: takesData }] = await Promise.all([
        supabase
          .from('daily_prompts')
          .select('prompt_date')
          .gte('prompt_date', startStr)
          .lte('prompt_date', endStr),
        supabase
          .from('takes')
          .select('prompt_date')
          .eq('user_id', user.id)
          .gte('prompt_date', startStr)
          .lte('prompt_date', endStr)
      ]);

      const promptDates = new Set<string>((prompts || []).map((p: any) => p.prompt_date));
      const answered = new Set<string>((takesData || []).map((t: any) => t.prompt_date));

      const answeredList: Date[] = [];
      const missedList: Date[] = [];
      // Iterate through the month days
      for (let d = new Date(start); d <= clampedEnd; d.setDate(d.getDate() + 1)) {
        const ymd = formatDate(d);
        if (!promptDates.has(ymd)) continue; // skip days without a prompt
        if (answered.has(ymd)) {
          answeredList.push(new Date(d));
        } else {
          missedList.push(new Date(d));
        }
      }

      setAnsweredDates(answeredList);
      setMissedDates(missedList);
    } catch (e) {
      // Soft-fail; leave markers empty
      setAnsweredDates([]);
      setMissedDates([]);
    }
  };

  useEffect(() => {
    if (calendarOpen) {
      setCalendarMonth(new Date(selectedDate));
      loadMonthStatus(selectedDate);
    }
    // eslint-disable-next-line
  }, [calendarOpen]);

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
        {/* Minimal header with hamburger + logo (no tabs) */}
        <div className="flex-shrink-0 border-b border-brand-border safe-topbar">
          <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto flex justify-between items-center safe-px py-3">
            <button
              className="p-2 rounded hover:bg-brand-surface/80 focus:outline-none active:opacity-80 touch-target"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-brand-text" />
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-brand-text">🔥 TopTake</h1>
            <button className="p-2 rounded hover:bg-brand-surface/80 relative" aria-label="Messages" onClick={()=> setCurrentTab('messages')}>
              <MessageSquareText className="w-5 h-5 text-brand-text" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-accent text-white rounded-full text-[10px] px-1 leading-none">{unreadMessages > 9 ? '9+' : unreadMessages}</span>
              )}
            </button>
          </div>
        </div>
        
        {/* Desktop tabs removed; navigation handled exclusively by BottomNav */}
        
        <div className="flex-1 min-h-0">
          <div className="max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto h-full">
            {/* Simple date picker with monthly status indicators */}
            <div className="flex items-center justify-center gap-1.5 my-2 px-2 text-sm" style={{ display: (username || (currentTab !== 'feed' && currentTab !== 'toptakes')) ? 'none' : undefined }}>
              <Button variant="ghost" size="icon" onClick={goToPrevDay} aria-label="Previous day">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="px-3 py-1.5 rounded-full text-sm font-medium" onClick={() => setCalendarOpen(true)}>
                    {selectedDate.toLocaleDateString()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="center" className="bg-brand-surface border-brand-border p-2">
                  <Calendar
                    mode="single"
                    month={calendarMonth}
                    onMonthChange={(m)=>{ setCalendarMonth(m); loadMonthStatus(m); }}
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    toDate={today}
                    modifiers={{ answered: answeredDates, missed: missedDates }}
                    modifiersClassNames={{
                      answered: 'ring-2 ring-green-500 text-green-100',
                      missed: 'ring-2 ring-red-500 text-red-200'
                    }}
                  />
                  <div className="flex items-center justify-center gap-4 pt-2 text-xs text-brand-muted">
                    <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full ring-2 ring-green-500"></span> Answered</div>
                    <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 rounded-full ring-2 ring-red-500"></span> Missed</div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" onClick={goToNextDay} disabled={selectedDate.getTime() === today.getTime()} aria-label="Next day">
                <ChevronRight className="w-4 h-4" />
              </Button>
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
          onClose={() => { 
            // Stay on the selected date after submission so deep-linked profile returns here naturally
            setShowLateSubmit(false); 
          }}
          onPurchase={() => {/* billing/credit logic here */}}
          date={selectedDate}
        />
      )}

      {/* Spacer to prevent content being hidden behind the fixed BottomNav */}
      <div className="h-14 md:h-16" />
      <BottomNav currentTab={currentTab} onTabChange={(tab)=>{
        if (tab==='feed') navigate('/');
        if (tab==='profile') navigate('/profile');
        setCurrentTab(tab);
      }} unreadNotifications={unreadNotifications} />
    </div>
  );
};

export default MainAppScreen;