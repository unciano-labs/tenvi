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

  const navItems = MOBILE_BOTTOM_NAV_ITEMS.map((item) => ({
    label: item.mobileLabel || item.label,
    href: item.href,
    icon: item.icon,
    active: item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href),
  }));

  const activeIndex = navItems.findIndex((item) => item.active);

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
        id="mobile-bottom-nav"
        onClick={() => setIsShrunk(false)}
        onTouchStart={() => setIsShrunk(false)}
        onMouseEnter={() => setIsShrunk(false)}
        style={{
          WebkitBackdropFilter: 'blur(24px) saturate(1.5)',
          backdropFilter: 'blur(24px) saturate(1.5)',
        }}
        className={`pointer-events-auto origin-bottom relative rounded-full backdrop-blur-2xl backdrop-saturate-150 bg-background/55 dark:bg-card/75 border border-white/25 dark:border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),inset_0_-1px_2px_rgba(0,0,0,0.15),0_12px_32px_-4px_rgba(0,0,0,0.25)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),inset_0_-1px_2px_rgba(0,0,0,0.4),0_16px_36px_-4px_rgba(0,0,0,0.6)] flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)] transform-gpu select-none px-2.5 ${
          isShrunk
            ? 'h-12 w-[260px] shadow-md'
            : 'h-[62px] w-[330px] max-w-[calc(100vw-1.75rem)]'
        }`}
        aria-label="Mobile Bottom Navigation"
        role="navigation"
      >
        <div className="relative flex items-center w-full h-full">
          {/* Animated Sliding Liquid Glass / Lens Refraction Bubble */}
          <div
            id="mobile-nav-liquid-indicator"
            aria-hidden="true"
            className={`absolute top-0 bottom-0 left-0 flex items-center justify-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)] z-0 transform-gpu ${
              activeIndex >= 0 ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              width: '20%',
              transform: `translateX(${Math.max(0, activeIndex) * 100}%)`,
            }}
          >
            <div
              className={`relative border border-white/60 dark:border-white/30 bg-gradient-to-b from-white/40 via-white/15 to-white/30 dark:from-white/25 dark:via-white/10 dark:to-white/20 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-3px_6px_rgba(0,0,0,0.18),0_8px_20px_rgba(0,0,0,0.2)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.4),inset_0_-3px_6px_rgba(0,0,0,0.45),0_10px_24px_rgba(0,0,0,0.4)] transition-all duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)] ${
                isShrunk ? 'w-[38px] h-[38px] rounded-full' : 'w-[56px] h-[50px] rounded-[20px]'
              }`}
            >
              {/* Glossy top specular highlight rim */}
              <div className="absolute inset-x-2 top-0.5 h-[1.5px] rounded-full bg-gradient-to-r from-transparent via-white/95 dark:via-white/70 to-transparent pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)]" />
              {/* Subtle primary tint */}
              <div
                className={`absolute inset-0 bg-primary/10 dark:bg-primary/20 pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)] ${
                  isShrunk ? 'rounded-full' : 'rounded-[20px]'
                }`}
              />
            </div>
          </div>

          {navItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                data-nav-item={index}
                data-active={item.active ? 'true' : 'false'}
                href={item.href}
                aria-label={item.label}
                aria-current={item.active ? 'page' : undefined}
                onClick={() => setIsShrunk(false)}
                className={`relative z-10 flex-1 h-full flex flex-col items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)] active:scale-95 cursor-pointer touch-manipulation select-none ${
                  isShrunk ? 'rounded-full' : 'py-1 rounded-[20px]'
                } ${
                  item.active
                    ? 'text-primary dark:text-primary font-semibold'
                    : 'text-muted-foreground/80 hover:text-foreground hover:bg-white/10 dark:hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`size-5 shrink-0 transition-transform duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)] ${
                    item.active
                      ? 'scale-105 stroke-[2.25] text-primary dark:text-primary drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)]'
                      : 'stroke-2 text-muted-foreground/80'
                  }`}
                />
                <span
                  className={`leading-none truncate overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.45,0.64,1)] ${
                    isShrunk
                      ? 'opacity-0 max-h-0 max-w-0 scale-75 -translate-y-1 mt-0 pointer-events-none'
                      : 'opacity-100 max-h-5 max-w-[58px] scale-100 translate-y-0 text-[10px] mt-1 tracking-tight'
                  } ${item.active ? 'font-bold text-primary dark:text-primary' : 'text-muted-foreground'}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
