'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, ArrowLeft, ShieldAlert, LogOut } from 'lucide-react';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ThemeQuickToggle } from '@/components/ui/theme-toggle';
import { ADMIN_NAV_ITEMS } from './AdminSidebar';
import { logoutAction } from '@/app/actions/auth';
import { NotificationBell } from './NotificationBell';

interface AdminTopHeaderProps {
  userEmail: string;
}

export function AdminTopHeader({ userEmail }: AdminTopHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-border/50 px-4 sm:px-6 py-3 flex items-center justify-between transition-colors">
      {/* Left: Mobile Trigger & Brand */}
      <div className="flex items-center gap-3">
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                  aria-label="Open Admin Menu"
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
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-foreground">Tenvi</span>
                        <span className="px-1.5 py-0.5 text-3xs font-extrabold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded">
                          Admin
                        </span>
                      </div>
                      <span className="text-2xs text-muted-foreground block font-normal">
                        Control Plane
                      </span>
                    </div>
                  </SheetTitle>
                </SheetHeader>

                <nav className="p-3 space-y-1">
                  {ADMIN_NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold'
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

              <div className="p-4 space-y-3 bg-muted/40 border-t border-border/40">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-primary bg-lightprimary transition-colors"
                >
                  <ArrowLeft className="size-4" />
                  <span>Return to Personal Vault</span>
                </Link>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-left min-w-0 flex-1 pr-2">
                    <p className="text-2xs font-bold text-foreground truncate">{userEmail}</p>
                    <p className="text-3xs text-amber-600 dark:text-amber-400 font-semibold">Admin</p>
                  </div>
                  <ThemeQuickToggle />
                </div>

                <form action={logoutAction} className="w-full pt-1">
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 h-8 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <LogOut className="size-3.5" />
                    Log Out
                  </Button>
                </form>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Mobile Header Title */}
        <div className="flex md:hidden items-center gap-2">
          <TenviIcon className="size-7 rounded-lg shrink-0 shadow-xs" />
          <span className="text-base font-extrabold text-foreground">Tenvi Admin</span>
        </div>

        {/* Desktop Breadcrumb Badge */}
        <div className="hidden md:flex items-center gap-2">
          <span className="px-2 py-0.5 text-2xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-md flex items-center gap-1.5">
            <ShieldAlert className="size-3" />
            Control Plane
          </span>
          <span className="text-muted-foreground text-xs">/</span>
          <span className="text-xs font-semibold text-foreground capitalize">
            {pathname.split('/')[2] || 'Overview'}
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-time In-App Notification Bell */}
        <NotificationBell />

        {/* Switch back to Personal Vault */}
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-primary hover:bg-lightprimary border border-primary/20 transition-colors shadow-2xs"
        >
          <ArrowLeft className="size-3.5" />
          <span className="hidden sm:inline">Personal Vault</span>
        </Link>

        {/* Theme Switcher */}
        <ThemeQuickToggle />
      </div>
    </header>
  );
}
