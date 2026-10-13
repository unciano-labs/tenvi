'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_BOTTOM_NAV_ITEMS } from './nav-config';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = MOBILE_BOTTOM_NAV_ITEMS.map((item) => ({
    label: item.mobileLabel || item.label,
    href: item.href,
    icon: item.icon,
    active: item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href),
  }));

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-lift z-40 flex items-center justify-around"
      aria-label="Mobile Bottom Navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={item.active ? 'page' : undefined}
            className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] gap-1 py-1 px-2 rounded-2xl text-2xs font-medium transition-all cursor-pointer ${
              item.active
                ? 'text-primary bg-primary/10 font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="size-5 shrink-0" />
            <span className="leading-tight truncate max-w-[64px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
