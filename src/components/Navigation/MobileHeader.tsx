'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, User, Bell, LogOut } from 'lucide-react';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { MAIN_NAV_ITEMS } from './nav-config';
import { logoutAction } from '@/app/actions/auth';
import { ThemeQuickToggle } from '@/components/ui/theme-toggle';

interface MobileHeaderProps {
  userName: string;
  userEmail: string;
}

export function MobileHeader({ userName, userEmail }: MobileHeaderProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const initial = (userName || userEmail || 'U').charAt(0).toUpperCase();

  return (
    <header className="md:hidden sticky top-0 z-30 w-full bg-background/90 backdrop-blur-md px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between shadow-xs">
      {/* Brand logo & mobile menu sheet trigger */}
      <div className="flex items-center gap-2.5">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-9 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Open navigation menu"
              />
            }
          >
            <Menu className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 flex flex-col justify-between">
            <div>
              <SheetHeader className="p-5 pb-3">
                <SheetTitle className="flex items-center gap-3">
                  <TenviIcon className="size-9 rounded-xl shadow-xs" />
                  <div className="text-left">
                    <span className="text-lg font-bold text-foreground">Tenvi</span>
                    <span className="text-2xs text-muted-foreground block font-normal">Personal Money Hub</span>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <nav className="p-3 space-y-1">
                {MAIN_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active =
                    item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="size-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 space-y-3 bg-muted/40">
              <div className="p-3 rounded-2xl bg-card shadow-xs">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="size-8 rounded-xl bg-muted flex items-center justify-center text-foreground font-bold text-xs shrink-0">
                      {initial}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-foreground truncate">{userName}</p>
                      <p className="text-2xs text-muted-foreground truncate">{userEmail}</p>
                    </div>
                  </div>
                  <ThemeQuickToggle />
                </div>
              </div>

              <form action={logoutAction} className="w-full">
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-10 rounded-xl text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                >
                  <LogOut className="size-4" />
                  Log Out
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>

        <Link href="/dashboard" className="flex items-center gap-2">
          <TenviIcon className="size-7 rounded-xl shrink-0 shadow-xs" />
          <span className="text-base font-extrabold tracking-tight text-foreground">Tenvi</span>
        </Link>
      </div>

      {/* Quick shortcuts: Theme, Alerts & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <ThemeQuickToggle />

        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href="/dashboard/settings" />}
          className="size-9 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
          aria-label="Settings and Alerts"
        >
          <Bell className="size-4" />
        </Button>

        <Link
          href="/dashboard/settings"
          className="flex items-center gap-1.5 p-1 pl-1.5 pr-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
          title={`Signed in as ${userEmail}`}
        >
          <div className="size-6 rounded-full bg-primary text-primary-foreground font-bold text-2xs flex items-center justify-center shrink-0">
            {initial}
          </div>
          <span className="text-xs font-semibold text-foreground max-w-[70px] truncate">
            {userName.split(' ')[0]}
          </span>
        </Link>
      </div>
    </header>
  );
}
