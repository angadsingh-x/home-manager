import { Monitor, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme, type Theme } from '@/theme/useTheme';

const cycle: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const icons: Record<Theme, typeof Monitor> = { system: Monitor, light: Sun, dark: Moon };
const labels: Record<Theme, string> = {
  system: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = icons[theme];
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      aria-label={`${labels[theme]} (tap to switch)`}
      title={labels[theme]}
      onClick={() => setTheme(cycle[theme])}
    >
      <Icon className="size-4" />
    </Button>
  );
}
