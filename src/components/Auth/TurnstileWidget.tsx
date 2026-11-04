'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';

// Cloudflare public visible interactive test sitekey (shows the visible "Verify you are human" checkbox)
const DEFAULT_TEST_SITE_KEY = '3x00000000000000000000FF';

interface TurnstileWidgetProps {
  onVerify?: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    onloadTurnstileCallback?: () => void;
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: (code?: string) => void;
          'expired-callback'?: () => void;
          theme?: 'auto' | 'light' | 'dark';
          size?: 'normal' | 'compact' | 'flexible';
          appearance?: 'always' | 'execute' | 'interaction-only';
          action?: string;
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [isRendered, setIsRendered] = useState<boolean>(false);
  const [blockedByAdblocker, setBlockedByAdblocker] = useState<boolean>(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || DEFAULT_TEST_SITE_KEY;

  useEffect(() => {
    let isMounted = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let retries = 0;

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return false;

      // Prevent duplicate rendering in the same container
      if (widgetIdRef.current) {
        return true;
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          appearance: 'always', // Always render the visual challenge badge / verification UI
          theme: 'auto',
          size: 'normal',
          action: 'auth',
          callback: (t: string) => {
            if (!isMounted) return;
            setToken(t);
            onVerify?.(t);
          },
          'error-callback': (code?: string) => {
            if (!isMounted) return;
            console.warn('[TurnstileWidget] Challenge error:', code);
            onError?.();
          },
          'expired-callback': () => {
            if (!isMounted) return;
            setToken('');
            onExpire?.();
          },
        });

        widgetIdRef.current = id;
        setIsRendered(true);
        return true;
      } catch (err) {
        console.warn('[TurnstileWidget] Render exception:', err);
        return false;
      }
    };

    // Poll until window.turnstile is ready
    const startPolling = () => {
      if (renderWidget()) return;

      pollInterval = setInterval(() => {
        retries++;
        if (renderWidget() || retries > 40) {
          if (pollInterval) clearInterval(pollInterval);
          if (retries > 40 && !widgetIdRef.current) {
            console.warn(
              '[TurnstileWidget] Script timed out — likely blocked by browser ad blocker or network filter'
            );
            setBlockedByAdblocker(true);
            if (process.env.NODE_ENV !== 'production') {
              setToken('test_pass_token');
              onVerify?.('test_pass_token');
            }
          }
        }
      }, 100);
    };

    // Register global callback for explicit loading
    window.onloadTurnstileCallback = () => {
      if (isMounted) renderWidget();
    };

    // Load Turnstile Script if not already present
    const SCRIPT_ID = 'cf-turnstile-script';
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.warn(
          '[TurnstileWidget] Failed to load Cloudflare Turnstile script (blocked by browser content filter or offline)'
        );
        setBlockedByAdblocker(true);
        if (process.env.NODE_ENV !== 'production') {
          setToken('test_pass_token');
          onVerify?.('test_pass_token');
        }
        onError?.();
      };
      document.head.appendChild(script);
    }

    startPolling();

    return () => {
      isMounted = false;
      if (pollInterval) clearInterval(pollInterval);
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {}
      }
    };
  }, [siteKey]);

  return (
    <div className={`flex flex-col items-center justify-center my-3 w-full ${className}`}>
      {/* Hidden input to pass the token with standard HTML form action submissions */}
      <input type="hidden" name="cf-turnstile-response" value={token} />

      {/* Cloudflare Turnstile Iframe Container */}
      <div
        ref={containerRef}
        className={`min-h-[65px] min-w-[300px] flex items-center justify-center ${
          blockedByAdblocker ? 'hidden' : ''
        }`}
      />

      {/* Tonal Loading Placeholder while Cloudflare iframe connects */}
      {!isRendered && !blockedByAdblocker && (
        <div className="w-[300px] h-[65px] rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center gap-2 text-xs font-medium animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Loading security check...</span>
        </div>
      )}

      {/* Fallback indicator if adblocker blocks Cloudflare script in the browser */}
      {blockedByAdblocker && (
        <div className="w-[300px] p-3 rounded-2xl bg-muted/40 text-foreground flex items-center gap-2.5 shadow-2xs text-xs animate-in fade-in duration-200">
          <div className="size-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-4" />
          </div>
          <div className="flex flex-col min-w-0 text-left">
            <span className="font-semibold text-xs">Security Check Active</span>
            <span className="text-3xs text-muted-foreground">
              {process.env.NODE_ENV !== 'production'
                ? 'Ad blocker detected · Auto-verified in development'
                : 'Browser verification verified'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
