import React from 'react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export function ThemeSelector() {
  const { theme, setTheme, availableThemes } = useTheme();
  const { user } = useAppContext();
  const { toast } = useToast();

  const handleThemeSelect = async (themeId: string, premium: boolean) => {
    if (premium && !user?.isPremium) {
      toast({
        title: 'Premium Theme',
        description: 'This theme requires a premium subscription.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await supabase
        .from('profiles')
        .update({ theme_id: themeId })
        .eq('id', user?.id);

      setTheme(themeId as any);
      toast({
        title: 'Theme Changed',
        description: `Theme set to ${themeId.replace('_', ' ')}`
      });
    } catch (error) {
      console.error('Error updating theme:', error);
      toast({
        title: 'Error',
        description: 'Failed to update theme. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="bg-brand-surface/80 backdrop-blur-sm border-brand-border">
      <CardHeader>
        <CardTitle className="text-brand-text flex items-center justify-between">
          <span>Theme</span>
          <span className="text-xs text-brand-muted">Applies instantly</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {availableThemes.map((themeConfig) => (
            <Button
              key={themeConfig.id}
              variant="outline"
              className={cn("h-auto p-0 overflow-hidden relative group border-brand-border hover:border-brand-accent",
                theme === themeConfig.id && "ring-2 ring-brand-primary")}
              onClick={() => handleThemeSelect(themeConfig.id, themeConfig.premium)}
            >
              <div
                className="w-full h-24 transition-transform duration-300 group-hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${themeConfig.preview.background} 0%, ${themeConfig.preview.accent} 100%)`
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full" style={{ background: themeConfig.preview.primary }} />
                </div>
                {themeConfig.premium && !user?.isPremium && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-brand-danger" />
                  </div>
                )}
              </div>
              <div className="p-2 text-center">
                <div className="font-medium text-brand-text">{themeConfig.name}</div>
                <div className="text-xs text-brand-muted line-clamp-2">{themeConfig.description}</div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 