'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Menu, 
  Search, 
  Bell, 
  LogOut, 
  Settings, 
  Download, 
  HelpCircle,
  User,
  ChevronDown,
  ShieldAlert,
  MessageSquare,
  LifeBuoy,
} from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { SidebarTrigger } from '@/components/ui/sidebar';
import { GlobalSearchDialog } from './GlobalSearchDialog';
import { FeedbackModal } from '@/components/Forms/FeedbackModal';

interface TopHeaderProps {
  userName: string;
  userEmail: string;
  userRole?: 'admin' | 'member';
}

export function TopHeader({ userName, userEmail, userRole = 'member' }: TopHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const pathname = usePathname();
  const initial = (userName || userEmail || 'U').charAt(0).toUpperCase();

  return (
    <TooltipProvider delay={150}>
      <header className="sticky top-0 z-30 w-full bg-background/85 backdrop-blur-md px-3 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Left: Mobile hamburger & Desktop sidebar collapse & Brand / Search */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3">
          {/* Mobile Menu Trigger */}
          <div className="lg:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
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

                  <nav className="p-3 flex flex-col gap-0.5" aria-label="Main navigation">
                    {MAIN_NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const active =
                        item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          aria-current={active ? 'page' : undefined}
                          className={`flex min-h-12 items-center gap-3 px-3.5 rounded-xl text-sm transition-colors duration-(--motion-fast) ease-(--ease-in-out) outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            active
                              ? 'bg-lightprimary text-primary font-semibold'
                              : 'font-medium text-muted-foreground hover:text-foreground hover:bg-muted'
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
                  <div className="p-3 rounded-xl bg-card shadow-card">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="size-8 rounded-full bg-lightprimary text-primary flex items-center justify-center font-bold text-xs shrink-0">
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
                      className="w-full justify-start gap-2 h-11 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <LogOut className="size-4" />
                      Log out
                    </Button>
                  </form>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Sidebar Collapse / Expand Trigger */}
          <div className="hidden lg:flex items-center">
            <SidebarTrigger className="size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors" />
          </div>

          {/* Mobile Logo Brand */}
          <Link href="/dashboard" className="flex lg:hidden items-center gap-2 shrink-0">
            <TenviIcon className="size-7 rounded-lg shrink-0 shadow-xs" />
            <span className="text-base font-extrabold tracking-tight text-foreground">Tenvi</span>
          </Link>

          {/* Mobile Search Trigger Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="flex lg:hidden size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            aria-label="Open search dialog"
          >
            <Search className="size-4" />
          </Button>

          {/* Desktop Search Trigger / Functional Search Button */}
          <div className="hidden lg:flex min-w-0 flex-1 max-w-md items-center">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="no-spring flex w-full min-w-0 h-10 items-center gap-2.5 px-3.5 rounded-xl bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground text-sm cursor-pointer transition-colors duration-(--motion-fast) ease-(--ease-in-out) outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Search records (⌘K)"
            >
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-left">Search transactions, cards, accounts, properties…</span>
              <kbd className="hidden xl:inline-flex shrink-0 items-center px-1.5 py-0.5 text-3xs font-mono font-medium text-muted-foreground bg-background rounded">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Quick-Switch to Admin Panel for Administrators */}
          {userRole === 'admin' && (
            <Link
              href="/admin"
              className="inline-flex h-9 items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
              title="Switch to Admin Control Plane"
              aria-label="Admin panel"
            >
              <ShieldAlert className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="hidden xl:inline">Admin panel</span>
            </Link>
          )}

          {/* Friendly helper tooltip for non-tech users */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  nativeButton={false}
                  render={<Link href="/dashboard/settings" />}
                  className="hidden sm:inline-flex size-8 sm:size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  aria-label="Help and guidance"
                />
              }
            >
              <HelpCircle className="size-4" />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Need help? View guide and account settings
            </TooltipContent>
          </Tooltip>

          {/* Theme Switcher */}
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="hidden sm:flex items-center justify-center size-9 rounded-lg hover:bg-muted transition-colors cursor-pointer" />
              }
            >
              <ThemeQuickToggle />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Switch between Light and Dark mode
            </TooltipContent>
          </Tooltip>

          {/* Real-time In-App Notification Bell */}
          <NotificationBell />

          {/* User Profile Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="no-spring flex h-10 items-center gap-2 pl-1 pr-2 rounded-xl hover:bg-muted/80 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="User account menu"
                />
              }
            >
              <div className="size-7 rounded-full bg-lightprimary text-primary font-bold text-xs flex items-center justify-center shrink-0">
                {initial}
              </div>
              <div className="hidden xl:flex min-w-0 flex-col text-left">
                <span className="text-xs font-semibold text-foreground leading-tight max-w-[120px] truncate">
                  {userName || 'Account'}
                </span>
                <span className={`text-3xs leading-none ${userRole === 'admin' ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-muted-foreground'}`}>
                  {userRole === 'admin' ? 'Administrator' : 'Member'}
                </span>
              </div>
              <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-60 p-1.5 rounded-xl shadow-lift">
              <DropdownMenuLabel className="px-2 py-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground truncate">{userName}</p>
                  {userRole === 'admin' && (
                    <span className="px-1.5 py-0.5 text-3xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-2xs text-muted-foreground font-normal truncate">{userEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1.5" />

              {/* Admin Mode Switcher Item */}
              {userRole === 'admin' && (
                <>
                  <DropdownMenuItem
                    className="rounded-lg px-2 py-1.5 text-xs text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer"
                    render={<Link href="/admin" />}
                  >
                    <ShieldAlert className="size-3.5 mr-2 text-amber-600 dark:text-amber-400" />
                    <span>Admin Control Plane</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1.5" />
                </>
              )}

              <DropdownMenuItem
                className="rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-lightprimary hover:text-primary transition-colors cursor-pointer"
                render={<Link href="/dashboard/settings" />}
              >
                <User className="size-3.5 mr-2 text-muted-foreground" />
                <span>Account & Profile</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-lightprimary hover:text-primary transition-colors cursor-pointer"
                render={<Link href="/dashboard/settings" />}
              >
                <Download className="size-3.5 mr-2 text-muted-foreground" />
                <span>Export Data (CSV / JSON)</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-lightprimary hover:text-primary transition-colors cursor-pointer"
                render={<Link href="/dashboard/settings" />}
              >
                <Settings className="size-3.5 mr-2 text-muted-foreground" />
                <span>Settings & Notifications</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-lightprimary hover:text-primary transition-colors cursor-pointer"
                render={<Link href="/dashboard/support" />}
              >
                <LifeBuoy className="size-3.5 mr-2 text-primary" />
                <span>Support & Tickets</span>
              </DropdownMenuItem>

              <DropdownMenuItem
                className="rounded-lg px-2 py-1.5 text-xs text-foreground hover:bg-lightprimary hover:text-primary transition-colors cursor-pointer"
                onClick={() => setFeedbackOpen(true)}
              >
                <MessageSquare className="size-3.5 mr-2 text-primary" />
                <span>Report Bug / Feedback</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1.5" />

              <form action={logoutAction} className="w-full">
                <button
                  type="submit"
                  className="w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <LogOut className="size-3.5 mr-2" />
                  <span>Log out</span>
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Spotlight / Command Search Dialog */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />

      {/* Direct Feedback & Bug Reporting Modal */}
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </TooltipProvider>
  );
}
