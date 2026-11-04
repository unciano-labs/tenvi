'use client';

import React, { useEffect, useRef, useState } from 'react';

// Cloudflare public always-pass test sitekey for local development & preview builds
const DEFAULT_TEST_SITE_KEY = '1x00000000000000000000AA';

interface TurnstileWidgetProps {
  onVerify?: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'auto' | 'light' | 'dark';
          size?: 'normal' | 'compact';
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
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || DEFAULT_TEST_SITE_KEY;

  useEffect(() => {
    let isMounted = true;

    // Load Cloudflare Turnstile script dynamically
    const loadScript = () => {
      if (document.getElementById('cf-turnstile-script')) {
        renderWidget();
        return;
      }

      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (isMounted) renderWidget();
      };
      script.onerror = () => {
        console.warn('[TurnstileWidget] Failed to load Cloudflare Turnstile script');
        onError?.();
      };
      document.head.appendChild(script);
    };

    const renderWidget = () => {
      if (!isMounted || !containerRef.current || !window.turnstile) return;

      // Clear any prior widget instances
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }

      try {
        const id = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (t: string) => {
            if (!isMounted) return;
            setToken(t);
            onVerify?.(t);
          },
          'error-callback': () => {
            if (!isMounted) return;
            onError?.();
          },
          'expired-callback': () => {
            if (!isMounted) return;
            setToken('');
            onExpire?.();
          },
          theme: 'auto',
        });
        widgetIdRef.current = id;
      } catch (err) {
        console.warn('[TurnstileWidget] Render error:', err);
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      loadScript();
    }

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {}
      }
    };
  }, [siteKey]);

  return (
    <div className={`flex flex-col items-center justify-center my-2 ${className}`}>
      {/* Hidden input to pass the token with standard HTML form action submissions */}
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <div ref={containerRef} className="min-h-[65px] flex items-center justify-center" />
    </div>
  );
}

