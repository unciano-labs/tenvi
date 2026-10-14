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
  ChevronDown
} from 'lucide-react';
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

interface TopHeaderProps {
  userName: string;
  userEmail: string;
}

export function TopHeader({ userName, userEmail }: TopHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const initial = (userName || userEmail || 'U').charAt(0).toUpperCase();

  return (
    <TooltipProvider delay={150}>
      <header className="sticky top-0 z-30 w-full bg-background/80 backdrop-blur-md border-b border-border/50 px-4 sm:px-6 py-3 flex items-center justify-between transition-colors">
        {/* Left: Mobile hamburger & Desktop sidebar collapse & Brand / Search */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
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

                  <nav className="p-3 space-y-1">
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
                          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                            active
                              ? 'bg-lightprimary text-primary font-bold'
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
                  <div className="p-3 rounded-lg bg-card border border-border/40 shadow-xs">
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
                      className="w-full justify-start gap-2 h-9 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <LogOut className="size-4" />
                      Log Out
                    </Button>
                  </form>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Desktop Sidebar Collapse / Expand Trigger */}
          <div className="hidden md:flex items-center">
            <SidebarTrigger className="size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors" />
          </div>

          {/* Mobile Logo Brand */}
          <Link href="/dashboard" className="flex md:hidden items-center gap-2">
            <TenviIcon className="size-7 rounded-lg shrink-0 shadow-xs" />
            <span className="text-base font-extrabold tracking-tight text-foreground">Tenvi</span>
          </Link>

          {/* Mobile Search Trigger Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSearchOpen(true)}
            className="flex md:hidden size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            aria-label="Open search dialog"
          >
            <Search className="size-4" />
          </Button>

          {/* Desktop Search Trigger / Functional Search Button */}
          <div className="hidden md:flex items-center">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium cursor-pointer transition-all border border-border/50 shadow-xs outline-none"
              aria-label="Search records (⌘K)"
            >
              <Search className="size-3.5 text-muted-foreground" />
              <span className="truncate max-w-[200px] lg:max-w-xs">Search transactions, cards, accounts, properties...</span>
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 text-3xs font-mono font-medium text-muted-foreground bg-background rounded border border-border">
                ⌘K
              </kbd>
            </button>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
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
                <div className="flex items-center justify-center size-8 sm:size-9 rounded-lg hover:bg-muted transition-colors cursor-pointer" />
              }
            >
              <ThemeQuickToggle />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Switch between Light and Dark mode
            </TooltipContent>
          </Tooltip>

          {/* Notification Bell */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  nativeButton={false}
                  render={<Link href="/dashboard/settings" />}
                  className="relative size-8 sm:size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                  aria-label="Alerts and reminders"
                />
              }
            >
              <Bell className="size-4" />
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              View bill reminders and notifications
            </TooltipContent>
          </Tooltip>

          {/* User Profile Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button
                  type="button"
                  className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer outline-none border border-border/40"
                  aria-label="User account menu"
                />
              }
            >
              <div className="size-7 rounded-full bg-lightprimary text-primary font-bold text-xs flex items-center justify-center shrink-0">
                {initial}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-foreground leading-tight max-w-[100px] truncate">
                  {userName || 'Account'}
                </span>
                <span className="text-3xs text-muted-foreground leading-none">
                  Member
                </span>
              </div>
              <ChevronDown className="size-3 text-muted-foreground ml-0.5" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-lift border border-border/60">
              <DropdownMenuLabel className="px-2 py-1.5">
                <p className="text-xs font-bold text-foreground truncate">{userName}</p>
                <p className="text-2xs text-muted-foreground font-normal truncate">{userEmail}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1.5" />

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

              <DropdownMenuSeparator className="my-1.5" />

              <form action={logoutAction} className="w-full">
                <button
                  type="submit"
                  className="w-full flex items-center px-2 py-1.5 rounded-lg text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                >
                  <LogOut className="size-3.5 mr-2" />
                  <span>Log Out</span>
                </button>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Global Spotlight / Command Search Dialog */}
      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </TooltipProvider>
  );
}
