'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_BOTTOM_NAV_ITEMS } from './nav-config';

export function MobileNav() {
  const pathname = usePathname();
  const [isShrunk, setIsShrunk] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    opacity: number;
  }>({ left: 0, top: 0, width: 0, height: 0, opacity: 0 });

  const navItems = MOBILE_BOTTOM_NAV_ITEMS.map((item) => ({
    label: item.mobileLabel || item.label,
    href: item.href,
    icon: item.icon,
    active: item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href),
  }));

  const activeIndex = navItems.findIndex((item) => item.active);

  const updateIndicator = useCallback(() => {
    const targetIndex = activeIndex >= 0 ? activeIndex : 0;
    const activeEl = itemRefs.current[targetIndex];
    if (activeEl) {
      setIndicatorStyle({
        left: activeEl.offsetLeft,
        top: activeEl.offsetTop,
        width: activeEl.offsetWidth,
        height: activeEl.offsetHeight,
        opacity: 1,
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update indicator position on route change, shrink toggle, and window resize
  useEffect(() => {
    updateIndicator();
    const frame = requestAnimationFrame(updateIndicator);
    const timeout = setTimeout(updateIndicator, 450); // after spring transition completes
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timeout);
    };
  }, [updateIndicator, isShrunk, pathname]);

  useEffect(() => {
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  // Track vertical scroll direction across the app shell with capture: true
  useEffect(() => {
    const handleScroll = (e?: Event) => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          let currentY = 0;
          let maxScroll = 0;

          // Check if event target has scroll position
          const target = e?.target as HTMLElement | null;
          if (
            target &&
            typeof target.scrollTop === 'number' &&
            target !== document.documentElement &&
            target !== (document as unknown)
          ) {
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

  return (
    <div className="md:hidden fixed inset-x-0 bottom-4 pb-safe z-50 flex justify-center pointer-events-none">
      {/* Optional lightweight SVG lens refraction filter */}
      <svg className="sr-only" aria-hidden="true">
        <defs>
          <filter id="liquid-lens-refraction" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <nav
        onClick={() => setIsShrunk(false)}
        onTouchStart={() => setIsShrunk(false)}
        onMouseEnter={() => setIsShrunk(false)}
        className={`pointer-events-auto origin-bottom relative rounded-full backdrop-blur-2xl backdrop-saturate-150 bg-background/55 dark:bg-card/75 border border-white/25 dark:border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-1px_2px_rgba(0,0,0,0.15),0_12px_32px_-4px_rgba(0,0,0,0.25)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-1px_2px_rgba(0,0,0,0.4),0_16px_36px_-4px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform-gpu select-none ${
          isShrunk
            ? 'h-12 px-2.5 gap-1 scale-95 shadow-md'
            : 'h-[62px] px-3.5 gap-1.5 w-auto max-w-[calc(100vw-1.75rem)] min-w-[320px]'
        }`}
        aria-label="Mobile Bottom Navigation"
        role="navigation"
      >
        {/* Animated Sliding Liquid Glass / Lens Refraction Bubble */}
        <div
          aria-hidden="true"
          className={`absolute pointer-events-none transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-0 transform-gpu ${
            indicatorStyle.opacity > 0 ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            transform: `translate3d(${indicatorStyle.left}px, ${indicatorStyle.top - (isShrunk ? 2 : 4)}px, 0)`,
            width: `${indicatorStyle.width}px`,
            height: `${indicatorStyle.height + (isShrunk ? 4 : 8)}px`,
          }}
        >
          <div className="w-full h-full relative rounded-[22px] border border-white/50 dark:border-white/25 bg-gradient-to-b from-white/35 via-white/10 to-white/25 dark:from-white/20 dark:via-white/5 dark:to-white/15 backdrop-blur-md backdrop-brightness-110 dark:backdrop-brightness-125 shadow-[inset_0_2px_3px_rgba(255,255,255,0.85),inset_0_-3px_6px_rgba(0,0,0,0.18),0_6px_16px_rgba(0,0,0,0.2)] dark:shadow-[inset_0_2px_3px_rgba(255,255,255,0.35),inset_0_-3px_6px_rgba(0,0,0,0.45),0_8px_20px_rgba(0,0,0,0.4)]">
            {/* Glossy top specular highlight rim */}
            <div className="absolute inset-x-2 top-0.5 h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-white/95 dark:via-white/70 to-transparent pointer-events-none" />
            {/* Subtle primary tint */}
            <div className="absolute inset-0 rounded-[22px] bg-primary/10 dark:bg-primary/20 pointer-events-none" />
          </div>
        </div>

        {navItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              href={item.href}
              aria-current={item.active ? 'page' : undefined}
              onClick={() => {
                setIsShrunk(false);
                if (itemRefs.current[index]) {
                  const el = itemRefs.current[index]!;
                  setIndicatorStyle({
                    left: el.offsetLeft,
                    top: el.offsetTop,
                    width: el.offsetWidth,
                    height: el.offsetHeight,
                    opacity: 1,
                  });
                }
              }}
              className={`relative z-10 flex flex-col items-center justify-center rounded-[20px] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] active:scale-95 cursor-pointer touch-manipulation select-none ${
                isShrunk ? 'size-9 min-w-9 p-0' : 'min-w-[56px] h-12 py-1 px-2.5'
              } ${
                item.active
                  ? 'text-primary dark:text-primary font-semibold'
                  : 'text-muted-foreground/80 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5'
              }`}
            >
              <Icon
                className={`size-5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  item.active
                    ? 'scale-105 stroke-[2.25] text-primary dark:text-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]'
                    : 'stroke-2 text-muted-foreground/80'
                }`}
              />
              <span
                className={`leading-none truncate transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                  isShrunk
                    ? 'opacity-0 max-h-0 scale-75 -translate-y-1 pointer-events-none'
                    : 'opacity-100 max-h-4 scale-100 translate-y-0 text-[10px] mt-1 max-w-[58px] tracking-tight'
                } ${item.active ? 'font-bold text-primary dark:text-primary' : 'text-muted-foreground'}`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
