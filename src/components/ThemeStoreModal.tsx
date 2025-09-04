import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { themes, Theme, isPremiumTheme, getThemeColors } from '@/lib/themes';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';

async function createThemeCheckout(userId: string, themeId: string, promoCode?: string) {
  const resp = await fetch('https://toptake.onrender.com/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lookupKey: 'theme_single_099',
      userId,
      mode: 'payment',
      promoCode,
      metadata: { theme_id: themeId }
    })
  });
  if (!resp.ok) throw new Error('Checkout creation failed');
  return resp.json();
}

interface ThemeStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_PRICE = 2.99;

const ThemePreview: React.FC<{ themeId: Theme, selected: boolean, onSelect: () => void }> = ({ themeId, selected, onSelect }) => {
  const c = getThemeColors(themeId);
  return (
    <button
      onClick={onSelect}
      className={`rounded-lg border p-3 text-left transition ${selected ? 'border-brand-accent' : 'border-brand-border'} w-full`}
      style={{ background: c.background }}
    >
      <div className="text-sm font-semibold" style={{ color: c.text }}>{themeId}</div>
      <div className="flex gap-2 mt-2">
        <span className="w-5 h-5 rounded" style={{ background: c.primary }} />
        <span className="w-5 h-5 rounded" style={{ background: c.secondary }} />
        <span className="w-5 h-5 rounded" style={{ background: c.accent }} />
      </div>
    </button>
  );
};

const ThemeStoreModal: React.FC<ThemeStoreModalProps> = ({ isOpen, onClose }) => {
  const { user, setUser } = useAppContext();
  const [selectedTheme, setSelectedTheme] = useState<Theme>('light');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const isAdminTester = (user?.email || '').toLowerCase() === 'lindsey@letsclink.com';

  const preview = useMemo(() => getThemeColors(selectedTheme), [selectedTheme]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const premium = isPremiumTheme(selectedTheme);
      if (premium && !user.isPremium) {
        setError(`This is a premium theme. Purchase required ($${THEME_PRICE}).`);
        setSaving(false);
        return;
      }
      const { error: upErr } = await supabase
        .from('profiles')
        .update({ theme_id: selectedTheme })
        .eq('id', user.id);
      if (upErr) throw upErr;
      setUser({ ...user, theme_id: selectedTheme });
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save theme');
    } finally {
      setSaving(false);
    }
  };

  const handlePurchase = async () => {
    if (!user) return;
    setPurchasing(true);
    setError(null);
    try {
      const promo = isAdminTester ? 'LINDSEY' : undefined;
      const { url } = await createThemeCheckout(user.id, selectedTheme, promo);
      window.location.href = url;
    } catch (e: any) {
      setError(e?.message || 'Failed to purchase');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Theme Store</DialogTitle>
          <DialogDescription>Preview themes and apply your favorite. Premium themes require purchase.</DialogDescription>
        </DialogHeader>
        {/* Large example preview */}
        <div className="rounded-lg border border-brand-border p-4 mb-4" style={{ background: preview.background, color: preview.text }}>
          <div className="font-semibold mb-2">Example</div>
          <div className="rounded-md p-3 mb-3" style={{ background: preview.accent, color: preview.background }}>Header</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md p-3 border" style={{ borderColor: preview.secondary }}>
              <div className="text-sm mb-2">Card title</div>
              <div className="text-xs opacity-80">Some example content...</div>
            </div>
            <div className="rounded-md p-3 border" style={{ borderColor: preview.secondary }}>
              <div className="text-sm mb-2">Another card</div>
              <div className="text-xs opacity-80">Try different themes to preview.</div>
            </div>
          </div>
          <div className="mt-3">
            <button className="px-3 py-2 rounded text-sm font-semibold" style={{ background: preview.primary, color: preview.background }}>Primary Button</button>
          </div>
        </div>

        {/* Small pickers */}
        <div className="grid grid-cols-2 gap-3">
          {themes.map(t => (
            <ThemePreview
              key={t.id}
              themeId={t.id as Theme}
              selected={selectedTheme === t.id}
              onSelect={() => setSelectedTheme(t.id as Theme)}
            />
          ))}
        </div>
        {isPremiumTheme(selectedTheme) && (
          <div className="text-sm text-brand-muted mt-2">Selected theme is premium. Price: ${THEME_PRICE.toFixed(2)}</div>
        )}
        {error && <div className="text-brand-danger text-sm mt-2">{error}</div>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving || purchasing}>Cancel</Button>
          {isPremiumTheme(selectedTheme) && !user?.isPremium ? (
            <>
              <Button onClick={handlePurchase} disabled={purchasing}>
                {purchasing ? 'Processing...' : `Purchase Theme ($${THEME_PRICE.toFixed(2)})`}
              </Button>
              {isAdminTester && (
                <Button variant="secondary" onClick={handlePurchase} disabled={purchasing}>Demo Purchase</Button>
              )}
            </>
          ) : (
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Apply Theme'}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeStoreModal;


