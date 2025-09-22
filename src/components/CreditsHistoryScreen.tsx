import React, { useEffect, useState } from 'react';
import { useCredits } from '@/lib/credits';
import { ScrollArea } from '@/components/ui/scroll-area';

const CreditsHistoryScreen: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { getCreditHistory, getCreditPurchases } = useCredits();
  const [history, setHistory] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [h, p] = await Promise.all([
        getCreditHistory(100, 0),
        getCreditPurchases(),
      ]);
      setHistory(h);
      setPurchases(p);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-shrink-0 px-3 py-2 border-b border-brand-border bg-brand-surface flex items-center gap-2">
        {onBack && (
          <button className="text-sm text-brand-text" onClick={onBack}>Back</button>
        )}
        <div className="text-[11px] uppercase tracking-wide text-brand-muted">Credits history</div>
      </div>
      <ScrollArea className="h-full">
        <div className="p-3 space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Recent activity</div>
            <div className="divide-y divide-brand-border border border-brand-border rounded">
              {loading ? (
                <div className="p-3 text-brand-muted text-sm">Loading…</div>
              ) : history.length ? history.map((h, idx) => (
                <div key={idx} className="p-3 text-sm flex items-center justify-between">
                  <div>
                    <div className="text-brand-text capitalize">{h.action} {h.amount} {h.credit_type.replace('_',' ')}</div>
                    <div className="text-[11px] text-brand-muted">{new Date(h.created_at).toLocaleString()}</div>
                  </div>
                  {h.description && <div className="text-[12px] text-brand-muted ml-4">{h.description}</div>}
                </div>
              )) : (
                <div className="p-3 text-brand-muted text-sm">No activity yet.</div>
              )}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium mb-2">Purchases</div>
            <div className="divide-y divide-brand-border border border-brand-border rounded">
              {loading ? (
                <div className="p-3 text-brand-muted text-sm">Loading…</div>
              ) : purchases.length ? purchases.map((p, idx) => (
                <div key={idx} className="p-3 text-sm flex items-center justify-between">
                  <div>
                    <div className="text-brand-text capitalize">{p.product_type?.replace('_',' ')}</div>
                    <div className="text-[11px] text-brand-muted">{new Date(p.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-brand-text font-medium">${Number(p.amount_paid || 0).toFixed(2)}</div>
                </div>
              )) : (
                <div className="p-3 text-brand-muted text-sm">No purchases yet.</div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default CreditsHistoryScreen;


