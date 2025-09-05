import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface SearchScreenProps {
  onGoToTake?: (takeId: string) => void;
}

interface ProfileRow { id: string; username: string | null; }
interface TakeRow { id: string; user_id: string; content: string; prompt_date: string; is_anonymous?: boolean; }

const RECENT_KEY = 'search:recent-v1';

export const SearchScreen: React.FC<SearchScreenProps> = ({ onGoToTake }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'people' | 'takes'>('people');
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [takes, setTakes] = useState<TakeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(0, 8) : [];
    } catch { return []; }
  });
  const debounceRef = useRef<number | null>(null);

  const saveRecent = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecent(prev => {
      const next = [trimmed, ...prev.filter(x => x.toLowerCase() !== trimmed.toLowerCase())].slice(0, 8);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const performSearch = useCallback(async (q: string) => {
    const term = q.trim();
    setLoading(true);
    try {
      if (!term) {
        setProfiles([]);
        setTakes([]);
        setLoading(false);
        return;
      }

      // People
      const { data: people } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', `%${term}%`)
        .limit(20);
      setProfiles((people as any) || []);

      // Takes
      const { data: takeRows } = await supabase
        .from('takes')
        .select('id, user_id, content, prompt_date, is_anonymous')
        .ilike('content', `%${term}%`)
        .order('created_at', { ascending: false })
        .limit(30);
      setTakes((takeRows as any) || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      performSearch(query);
    }, 250);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [query, performSearch]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveRecent(query);
    performSearch(query);
  };

  return (
    <div className="p-4">
      <form onSubmit={onSubmit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users and takes"
          className="flex-1"
        />
        <Button type="submit">Search</Button>
      </form>

      {recent.length > 0 && !query.trim() && (
        <div className="mt-4">
          <div className="text-sm text-brand-muted mb-2">Recent</div>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <button
                key={r}
                className="px-3 py-1 rounded bg-brand-surface border border-brand-border text-sm hover:border-brand-accent"
                onClick={() => setQuery(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="takes">Takes</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'people' && (
        <div className="mt-3 space-y-2">
          {loading && <div className="text-brand-muted text-sm">Searching…</div>}
          {!loading && profiles.map((p) => (
            <Card key={p.id} className="bg-brand-surface border-brand-border hover:border-brand-accent">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="text-brand-text font-medium">{p.username || 'user'}</div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/` + encodeURIComponent(p.username || ''))}>View</Button>
              </CardContent>
            </Card>
          ))}
          {!loading && profiles.length === 0 && query.trim() && (
            <div className="text-brand-muted text-sm">No users found</div>
          )}
        </div>
      )}

      {activeTab === 'takes' && (
        <div className="mt-3 space-y-2">
          {loading && <div className="text-brand-muted text-sm">Searching…</div>}
          {!loading && takes.map((t) => (
            <Card key={t.id} className="bg-brand-surface border-brand-border hover:border-brand-accent">
              <CardContent className="p-3">
                <div className="text-sm text-brand-muted mb-1">{new Date(t.prompt_date).toLocaleDateString()}</div>
                <div className="text-brand-text mb-2 break-words">{t.content}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onGoToTake && onGoToTake(t.id)}>Open</Button>
                  {!t.is_anonymous && (
                    <Button size="sm" variant="ghost" onClick={() => navigate('/' + t.user_id)}>Profile</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && takes.length === 0 && query.trim() && (
            <div className="text-brand-muted text-sm">No takes match</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchScreen;
