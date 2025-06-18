import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface AnalyticsRow {
  prompt: string;
  date: string;
  takes: number;
  comments: number;
  reactions: number;
  engagement: number;
}

interface LeaderboardUser {
  id: string;
  username: string;
  takes: number;
  comments: number;
  suggestions: number;
  avatar_url?: string;
}

const PromptAnalytics: React.FC = () => {
  const [rows, setRows] = useState<AnalyticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [sortCol, setSortCol] = useState<'engagement'|'takes'|'comments'|'reactions'|'date'>('engagement');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const { toast } = useToast();

  useEffect(() => {
    loadAnalytics();
    loadLeaderboard();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceStr = since.toISOString().split('T')[0];
      const { data: prompts, error: promptsError } = await supabase
        .from('daily_prompts')
        .select('*')
        .gte('prompt_date', sinceStr)
        .order('prompt_date', { ascending: false });
      if (promptsError) throw promptsError;
      const analytics: AnalyticsRow[] = await Promise.all(
        (prompts || []).map(async (p: { prompt_text: string; prompt_date: string; }) => {
          // Takes
          const { count: takesCount } = await supabase
            .from('takes')
            .select('id', { count: 'exact', head: true })
            .eq('prompt_date', p.prompt_date);
          // Comments
          const { count: commentsCount } = await supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('prompt_date', p.prompt_date);
          // Reactions
          const { data: takes } = await supabase
            .from('takes')
            .select('reactions')
            .eq('prompt_date', p.prompt_date);
          const totalReactions = await calculateTotalReactions(takes);
          return {
            prompt: p.prompt_text,
            date: p.prompt_date,
            takes: takesCount || 0,
            comments: commentsCount || 0,
            reactions: totalReactions,
            engagement: (takesCount || 0) + (commentsCount || 0) + totalReactions
          };
        })
      );
      setRows(analytics);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load analytics');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalReactions = async (takes: any[]) => {
    if (!takes || takes.length === 0) return 0;
    
    // Get all take IDs
    const takeIds = takes.map(t => t.id);
    
    // Query take_reactions table
    const { data: reactions, error } = await supabase
      .from('take_reactions')
      .select('take_id, reaction_type')
      .in('take_id', takeIds);
      
    if (error) {
      console.error('Error fetching reactions:', error);
      return 0;
    }
    
    // Count total reactions
    return reactions?.length || 0;
  };

  const loadLeaderboard = async () => {
    // Top users by takes, comments, suggestions
    // Get all users with at least one take, comment, or suggestion
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url');
    if (!profiles) return;
    // Takes
    const { data: takes } = await supabase
      .from('takes')
      .select('user_id');
    // Comments
    const { data: comments } = await supabase
      .from('comments')
      .select('user_id');
    // Suggestions
    const { data: suggestions } = await supabase
      .from('prompt_suggestions')
      .select('user_id');
    const userStats: Record<string, LeaderboardUser> = {};
    profiles.forEach((p: { id: string; username?: string; avatar_url?: string }) => {
      userStats[p.id] = {
        id: p.id,
        username: p.username || p.id,
        avatar_url: p.avatar_url,
        takes: 0,
        comments: 0,
        suggestions: 0,
      };
    });
    (takes || []).forEach((t: { user_id: string }) => { if (userStats[t.user_id]) userStats[t.user_id].takes += 1; });
    (comments || []).forEach((c: { user_id: string }) => { if (userStats[c.user_id]) userStats[c.user_id].comments += 1; });
    (suggestions || []).forEach((s: { user_id: string }) => { if (userStats[s.user_id]) userStats[s.user_id].suggestions += 1; });
    const arr = Object.values(userStats).filter(u => u.takes > 0 || u.comments > 0 || u.suggestions > 0);
    arr.sort((a, b) => (b.takes + b.comments + b.suggestions) - (a.takes + a.comments + a.suggestions));
    setLeaderboard(arr.slice(0, 10));
  };

  // Sort analytics table
  const sortedRows = [...rows].sort((a, b) => {
    let vA = a[sortCol];
    let vB = b[sortCol];
    if (sortCol === 'date') {
      vA = new Date(a.date).getTime();
      vB = new Date(b.date).getTime();
    }
    if (sortDir === 'asc') return vA - vB;
    return vB - vA;
  });

  const exportToCSV = (filename: string, rows: Record<string, unknown>[], columns: string[]) => {
    const csv = [columns.join(',')].concat(
      rows.map(row => columns.map(col => JSON.stringify(row[col] ?? '')).join(','))
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    saveAs(blob, filename);
  };

  const handleExportPrompts = async () => {
    const { data } = await supabase.from('daily_prompts').select('*');
    if (data) {
      exportToCSV('prompts.csv', data, ['id','prompt_date','prompt_text','status']);
      toast({ title: 'Prompts exported', description: 'Prompts CSV downloaded.', variant: 'default' });
    }
  };
  const handleExportTakes = async () => {
    const { data } = await supabase.from('takes').select('*');
    if (data) {
      exportToCSV('takes.csv', data, ['id','user_id','prompt_date','content','created_at']);
      toast({ title: 'Takes exported', description: 'Takes CSV downloaded.', variant: 'default' });
    }
  };
  const handleExportComments = async () => {
    const { data } = await supabase.from('comments').select('*');
    if (data) {
      exportToCSV('comments.csv', data, ['id','user_id','prompt_date','take_id','content','created_at']);
      toast({ title: 'Comments exported', description: 'Comments CSV downloaded.', variant: 'default' });
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Prompt Engagement Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button variant="default" size="sm" onClick={handleExportPrompts}>Export Prompts CSV</Button>
          <Button variant="default" size="sm" onClick={handleExportTakes}>Export Takes CSV</Button>
          <Button variant="default" size="sm" onClick={handleExportComments}>Export Comments CSV</Button>
        </div>
        {loading ? <div>Loading...</div> : error ? <div className="text-red-500">{error}</div> : (
          <>
            <div className="overflow-x-auto mb-8">
              <table className="min-w-full text-xs text-left text-brand-primary">
                <thead>
                  <tr>
                    <th className="px-2 py-1 cursor-pointer" onClick={() => setSortCol('prompt')}>Prompt</th>
                    <th className="px-2 py-1 cursor-pointer" onClick={() => setSortCol('date')}>Date</th>
                    <th className="px-2 py-1 cursor-pointer" onClick={() => setSortCol('takes')}>Takes</th>
                    <th className="px-2 py-1 cursor-pointer" onClick={() => setSortCol('comments')}>Comments</th>
                    <th className="px-2 py-1 cursor-pointer" onClick={() => setSortCol('reactions')}>Reactions</th>
                    <th className="px-2 py-1 cursor-pointer" onClick={() => setSortCol('engagement')}>Engagement</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, i) => (
                    <tr key={i} className={`border-b border-brand-border ${row.engagement >= 10 ? 'bg-card-gradient' : ''}`}>
                      <td className="px-2 py-1 max-w-xs truncate">{row.prompt}</td>
                      <td className="px-2 py-1">{row.date}</td>
                      <td className="px-2 py-1">{row.takes}</td>
                      <td className="px-2 py-1">{row.comments}</td>
                      <td className="px-2 py-1">{row.reactions}</td>
                      <td className="px-2 py-1 text-brand-primary font-bold">{row.engagement}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-brand-primary mb-2">Top Users</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left text-brand-primary">
                  <thead>
                    <tr>
                      <th className="px-2 py-1">User</th>
                      <th className="px-2 py-1">Takes</th>
                      <th className="px-2 py-1">Comments</th>
                      <th className="px-2 py-1">Suggestions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((u, i) => (
                      <tr key={u.id} className="border-b border-brand-border">
                        <td className="px-2 py-1 flex items-center gap-2">
                          {u.avatar_url ? <img src={u.avatar_url} alt="avatar" className="w-6 h-6 rounded-full border border-brand-border" /> : <span className="w-6 h-6 rounded-full bg-card-background flex items-center justify-center text-brand-primary font-bold">?</span>}
                          <span className="font-semibold">{u.username}</span>
                        </td>
                        <td className="px-2 py-1">{u.takes}</td>
                        <td className="px-2 py-1">{u.comments}</td>
                        <td className="px-2 py-1">{u.suggestions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PromptAnalytics; 