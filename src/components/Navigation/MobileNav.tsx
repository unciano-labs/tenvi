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
    <div className="lg:hidden fixed inset-x-0 bottom-3 pb-safe z-40 flex justify-center pointer-events-none">
      <nav
        id="mobile-bottom-nav"
        onClick={() => setIsShrunk(false)}
        onTouchStart={() => setIsShrunk(false)}
        onMouseEnter={() => setIsShrunk(false)}
        /* Shrink is a transform (no width/height animation) so nothing reflows mid-scroll */
        className={`pointer-events-auto origin-bottom relative h-16 w-[min(22rem,calc(100vw-1.5rem))] rounded-[1.375rem] bg-card/95 backdrop-blur-xl shadow-lift px-1.5 select-none transition-transform duration-(--motion-base) ease-(--ease-spring-soft) ${
          isShrunk ? 'scale-[0.88] translate-y-1' : 'scale-100'
        }`}
        aria-label="Mobile Bottom Navigation"
        role="navigation"
      >
        <div className="relative flex items-center w-full h-full">
          {/* Active indicator: a single tonal pill that springs between items via translateX */}
          <div
            id="mobile-nav-liquid-indicator"
            aria-hidden="true"
            className={`absolute inset-y-1.5 left-0 pointer-events-none transition-[transform,opacity] duration-(--motion-base) ease-(--ease-spring-pop) ${
              activeIndex >= 0 ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              width: `${100 / Math.max(1, navItems.length)}%`,
              transform: `translateX(${Math.max(0, activeIndex) * 100}%)`,
            }}
          >
            <div className="mx-1 h-full rounded-2xl bg-primary/10 dark:bg-primary/15" />
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
                className={`no-spring relative z-10 flex-1 min-w-0 h-full flex flex-col items-center justify-center gap-1 rounded-2xl cursor-pointer touch-manipulation select-none outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-(--motion-fast) ease-(--ease-in-out) ${
                  item.active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon
                  className={`size-5 shrink-0 transition-transform duration-(--motion-base) ease-(--ease-spring-pop) ${
                    isShrunk ? 'translate-y-2' : 'translate-y-0'
                  } ${item.active ? 'stroke-[2.25]' : 'stroke-2'}`}
                />
                <span
                  className={`max-w-full truncate px-0.5 text-[11px] leading-none transition-opacity duration-(--motion-fast) ease-(--ease-in-out) ${
                    isShrunk ? 'opacity-0' : 'opacity-100'
                  } ${item.active ? 'font-semibold' : 'font-medium'}`}
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
