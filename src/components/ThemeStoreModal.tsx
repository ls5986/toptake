import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { themes, Theme, isPremiumTheme, getThemeColors } from '@/lib/themes';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';

interface ThemeStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const THEME_PRICE = 2.99;

// Utilities for contrast-aware previews
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const v = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  const int = parseInt(v, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function luminance(hex: string): number {
  try {
    const { r, g, b } = hexToRgb(hex);
    const a = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  } catch {
    return 0.5;
  }
}

function isDark(hex: string) {
  return luminance(hex) < 0.5;
}

function surfaceOver(background: string, strength = 0.06) {
  const dark = isDark(background);
  const alpha = strength;
  return dark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
}

function borderOver(background: string, strength = 0.25) {
  const dark = isDark(background);
  const alpha = strength;
  return dark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
}

function textOn(hexColor: string) {
  return isDark(hexColor) ? '#FFFFFF' : '#000000';
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

const ThemePreview: React.FC<{ themeId: Theme, selected: boolean, onSelect: () => void }> = ({ themeId, selected, onSelect }) => {
  const c = getThemeColors(themeId);
  const bg = c.background;
  const surface = surfaceOver(bg, 0.08);
  const border = borderOver(bg, 0.18);
  return (
    <button
      onClick={onSelect}
      className={`rounded-lg border p-3 text-left transition ${selected ? 'border-brand-accent' : 'border-brand-border'} w-full`}
      style={{ background: bg }}
    >
      <div className="text-sm font-semibold" style={{ color: c.text }}>{themeId}</div>
      <div className="flex gap-2 mt-2 items-center">
        <span className="w-5 h-5 rounded" style={{ background: c.primary }} />
        <span className="w-5 h-5 rounded" style={{ background: c.secondary }} />
        <span className="w-5 h-5 rounded" style={{ background: c.accent }} />
        <span className="ml-auto px-2 py-0.5 rounded text-[10px]" style={{ background: surface, border: `1px solid ${border}`, color: c.text }}>surface</span>
      </div>
    </button>
  );
};

async function createThemeCheckout(userId: string, themeId: string, promoCode?: string) {
  const backendUrl = (import.meta as any)?.env?.VITE_BACKEND_URL || 'https://toptake.onrender.com';
  const resp = await fetch(`${backendUrl}/api/create-checkout-session`, {
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

const ThemeStoreModal: React.FC<ThemeStoreModalProps> = ({ isOpen, onClose }) => {
  const { user, setUser } = useAppContext();
  const [selectedTheme, setSelectedTheme] = useState<Theme>('light');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [ownedThemes, setOwnedThemes] = useState<string[]>([]);

  const isAdminTester = String((user as any)?.email || '').toLowerCase() === 'lindsey@letsclink.com';

  useEffect(() => {
    (async () => {
      try {
        if (!user?.id) return;
        const { data } = await supabase
          .from('user_themes')
          .select('theme_id')
          .eq('user_id', user.id);
        setOwnedThemes((data || []).map(r => r.theme_id));
      } catch {}
    })();
  }, [user?.id, isOpen]);

  const preview = useMemo(() => getThemeColors(selectedTheme), [selectedTheme]);
  const surface = useMemo(() => surfaceOver(preview.background, 0.08), [preview.background]);
  const surfaceAlt = useMemo(() => surfaceOver(preview.background, 0.12), [preview.background]);
  const border = useMemo(() => borderOver(preview.background, 0.2), [preview.background]);
  const calloutBg = useMemo(() => rgba(preview.primary, 0.15), [preview.primary]);
  const calloutBorder = useMemo(() => rgba(preview.primary, 0.35), [preview.primary]);
  const chipBg = useMemo(() => rgba(preview.accent, 0.18), [preview.accent]);
  const chipText = useMemo(() => textOn(preview.accent), [preview.accent]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      const premium = isPremiumTheme(selectedTheme);
      const owns = ownedThemes.includes(selectedTheme);
      if (premium && !owns) {
        setError(`This is a premium theme. Please purchase first ($${THEME_PRICE}).`);
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
      const result = await createThemeCheckout(user.id, selectedTheme, promo);
      if (result.free) {
        // Free grant path: refresh ownership and close
        const { data } = await supabase.from('user_themes').select('theme_id').eq('user_id', user.id);
        setOwnedThemes((data || []).map(r => r.theme_id));
        onClose();
        return;
      }
      window.location.href = result.url;
    } catch (e: any) {
      setError(e?.message || 'Failed to purchase');
    } finally {
      setPurchasing(false);
    }
  };

  const ownsSelected = ownedThemes.includes(selectedTheme);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0">
        <div className="flex flex-col max-h-[calc(100dvh-6rem)]">
          <div className="px-6 pt-6 overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Theme Store</DialogTitle>
              <DialogDescription>Preview themes and apply your favorite. Premium themes require purchase.</DialogDescription>
            </DialogHeader>
            {/* Large example preview with real contrast and dimension */}
            <div className="rounded-lg border p-4 mb-4" style={{ background: preview.background, color: preview.text, borderColor: border }}>
              <div className="text-xs uppercase tracking-wide opacity-80 mb-2">Example</div>
              {/* Header bar */}
              <div className="rounded-md p-3 mb-3 shadow-sm" style={{ background: preview.primary, color: textOn(preview.primary) }}>Header</div>
              {/* Light tinted callout for extra contrast */}
              <div className="rounded-md p-3 mb-3 border" style={{ background: calloutBg, borderColor: calloutBorder }}>
                <div className="text-xs font-medium mb-0.5" style={{ color: preview.text }}>Callout</div>
                <div className="text-xs" style={{ color: isDark(preview.background) ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)' }}>Light-tinted panel to separate content and add depth.</div>
              </div>

              {/* Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md p-3 border" style={{ background: surface, borderColor: border }}>
                  <div className="text-sm mb-1" style={{ color: preview.text }}>Card title</div>
                  <div className="text-xs" style={{ color: isDark(preview.background) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)' }}>Some example content...</div>
                </div>
                <div className="rounded-md p-3 border" style={{ background: surfaceAlt, borderColor: border }}>
                  <div className="text-sm mb-1" style={{ color: preview.text }}>Another card</div>
                  <div className="text-xs" style={{ color: isDark(preview.background) ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)' }}>Try different themes to preview.</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button className="px-3 py-2 rounded text-sm font-semibold border shadow-sm" style={{ background: preview.primary, color: textOn(preview.primary), borderColor: borderOver(preview.primary, 0.3) }}>Primary Button</button>
                <button className="px-3 py-2 rounded text-sm font-medium border" style={{ background: surface, color: preview.text, borderColor: border }}>Secondary</button>
                <span className="px-2 py-0.5 rounded-full text-[10px] border" style={{ background: chipBg, color: chipText, borderColor: calloutBorder }}>Tag</span>
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
              <div className="text-sm text-brand-muted mt-2">
                {ownsSelected ? 'Owned' : `Price: $${THEME_PRICE.toFixed(2)}`}
              </div>
            )}
            {error && <div className="text-brand-danger text-sm mt-2">{error}</div>}
            <div className="h-5" />
          </div>
          {/* sticky action bar */}
          <div className="mt-2 px-6 pb-6 sticky bottom-0 bg-brand-surface border-t border-brand-border pt-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving || purchasing}>Cancel</Button>
              {isPremiumTheme(selectedTheme) && !ownsSelected ? (
                <Button onClick={handlePurchase} disabled={purchasing}>
                  {purchasing ? 'Processing...' : `Purchase Theme ($${THEME_PRICE.toFixed(2)})`}
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Apply Theme'}</Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThemeStoreModal;


