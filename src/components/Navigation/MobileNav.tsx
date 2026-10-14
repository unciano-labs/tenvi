'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_BOTTOM_NAV_ITEMS } from './nav-config';

export function MobileNav() {
  const pathname = usePathname();
  const [isShrunk, setIsShrunk] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Track vertical scroll direction across the app shell with capture: true
  useEffect(() => {
    const handleScroll = (e?: Event) => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          let currentY = 0;
          let maxScroll = 0;

          // Check if event target has scroll position
          const target = e?.target as HTMLElement | null;
          if (target && typeof target.scrollTop === 'number' && target !== document.documentElement && target !== (document as unknown)) {
            currentY = target.scrollTop;
            maxScroll = target.scrollHeight - target.clientHeight;
          } else {
            const mainEl = document.getElementById('dashboard-main') || document.querySelector('main');
            if (mainEl && mainEl.scrollTop > 0) {
              currentY = mainEl.scrollTop;
              maxScroll = mainEl.scrollHeight - mainEl.clientHeight;
            } else {
              currentY = window.scrollY || document.documentElement.scrollTop || 0;
              maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            }
          }

          const delta = currentY - lastScrollY.current;

          // Always expand near the very top (<= 30px) or bottom
          if (currentY <= 30) {
            setIsShrunk(false);
            lastScrollY.current = Math.max(0, currentY);
            ticking.current = false;
            return;
          }

          if (maxScroll > 0 && currentY >= maxScroll - 20) {
            setIsShrunk(false);
            lastScrollY.current = currentY;
            ticking.current = false;
            return;
          }

          // Use 10px threshold to eliminate jitter and overscroll noise
          if (Math.abs(delta) > 10) {
            if (delta > 0 && currentY > 50) {
              // Scrolling down past 50px -> shrink dock
              setIsShrunk(true);
            } else if (delta < 0) {
              // Scrolling up -> expand dock
              setIsShrunk(false);
            }
            lastScrollY.current = currentY;
          }

          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    // Capture phase intercepts scroll events from any nested scroll container (#dashboard-main)
    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Expand back immediately upon route navigation
  useEffect(() => {
    setIsShrunk(false);
    lastScrollY.current = 0;
  }, [pathname]);

  const navItems = MOBILE_BOTTOM_NAV_ITEMS.map((item) => ({
    label: item.mobileLabel || item.label,
    href: item.href,
    icon: item.icon,
    active: item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href),
  }));

  return (
    <nav
      onClick={() => setIsShrunk(false)}
      onTouchStart={() => setIsShrunk(false)}
      onMouseEnter={() => setIsShrunk(false)}
      className={`md:hidden fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 transform-gpu rounded-full backdrop-blur-xl bg-background/85 dark:bg-card/90 border border-border/60 shadow-xl shadow-black/10 dark:shadow-black/50 flex items-center justify-center transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] select-none ${
        isShrunk
          ? 'h-12 px-2.5 gap-1 scale-95 shadow-md'
          : 'h-[60px] px-3.5 gap-1.5 w-auto max-w-[calc(100vw-1.75rem)] min-w-[320px]'
      }`}
      aria-label="Mobile Bottom Navigation"
      role="navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            onClick={() => setIsShrunk(false)}
            className={`relative flex flex-col items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-95 cursor-pointer ${
              isShrunk
                ? 'size-9 min-w-9 p-0'
                : 'min-w-[56px] h-12 py-1 px-2.5'
            } ${
              item.active
                ? 'bg-primary/12 text-primary dark:bg-primary/20 font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            <Icon
              className={`size-5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                item.active ? 'scale-105 stroke-[2.25]' : 'stroke-2'
              }`}
            />
            <span
              className={`leading-none truncate transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isShrunk
                  ? 'opacity-0 max-h-0 -translate-y-1 overflow-hidden m-0 p-0 text-[0px] pointer-events-none'
                  : 'opacity-100 max-h-4 text-[10px] mt-1 max-w-[58px] tracking-tight'
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
