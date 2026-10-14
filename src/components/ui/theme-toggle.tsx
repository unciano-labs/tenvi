'use client';

import * as React from 'react';
import { useTheme } from '@/components/theme-provider';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Dropdown menu theme toggle (Sun / Moon / Monitor).
 * Ideal for headers, navigation bars, and compact toolbars.
 */
export function ThemeToggle({
  className,
  align = 'end',
}: {
  className?: string;
  align?: 'start' | 'center' | 'end';
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-9 rounded-xl text-muted-foreground cursor-pointer', className)}
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="size-4 opacity-50" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'size-9 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer transition-colors',
              className
            )}
            aria-label="Select color theme"
          />
        }
      >
        {isDark ? (
          <Moon className="size-4 transition-transform duration-200" />
        ) : (
          <Sun className="size-4 transition-transform duration-200" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-40">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Sun className="size-4 text-amber-500" />
            <span>Light</span>
          </div>
          {theme === 'light' && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Moon className="size-4 text-blue-400" />
            <span>Dark</span>
          </div>
          {theme === 'dark' && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Monitor className="size-4 text-muted-foreground" />
            <span>System</span>
          </div>
          {theme === 'system' && <Check className="size-3.5 text-primary" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * 1-click Quick Toggle between Light and Dark mode.
 * Rotates smoothly on toggle.
 */
export function ThemeQuickToggle({ className }: { className?: string }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('size-9 rounded-xl text-muted-foreground cursor-pointer', className)}
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="size-4 opacity-50" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'size-9 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer transition-colors relative overflow-hidden',
        className
      )}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} theme`}
      aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} theme`}
    >
      <Sun
        className={cn(
          'size-4 transition-all duration-300 absolute',
          isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100 text-amber-500'
        )}
      />
      <Moon
        className={cn(
          'size-4 transition-all duration-300 absolute',
          isDark ? 'rotate-0 scale-100 opacity-100 text-blue-400' : '-rotate-90 scale-0 opacity-0'
        )}
      />
    </Button>
  );
}

/**
 * 3-way Segmented Control (Light | Dark | System) with zero borders.
 * Perfect for Settings pages, cards, and wide footers.
 */
export function ThemeSegmentedToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const options: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  if (!mounted) {
    return (
      <div className={cn('flex items-center gap-1 p-1 bg-muted rounded-xl', className)}>
        {options.map((opt) => (
          <div
            key={opt.value}
            className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-center text-muted-foreground opacity-50"
          >
            {opt.label}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme mode selection"
      className={cn('flex items-center gap-1 p-1 bg-muted rounded-xl', className)}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = theme === opt.value;

        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setTheme(opt.value)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none',
              isSelected
                ? 'bg-card text-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/40'
            )}
          >
            <Icon
              className={cn(
                'size-3.5 shrink-0',
                isSelected && opt.value === 'light' && 'text-amber-500',
                isSelected && opt.value === 'dark' && 'text-blue-400',
                isSelected && opt.value === 'system' && 'text-primary'
              )}
            />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
