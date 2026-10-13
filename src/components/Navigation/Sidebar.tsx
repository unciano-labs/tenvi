'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import { TenviIcon } from '@/components/ui/TenviIcon';
import {
  Sidebar as SidebarPrimitive,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import { MAIN_NAV_ITEMS } from './nav-config';
import { ThemeQuickToggle } from '@/components/ui/theme-toggle';

interface SidebarProps {
  userEmail?: string;
  userName?: string;
}

export function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname();

  const navItems = MAIN_NAV_ITEMS.map((item) => ({
    ...item,
    active: item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href),
  }));

  return (
    <SidebarPrimitive collapsible="icon" className="shadow-card border-none bg-card">
      <SidebarHeader className="p-4 sm:p-5">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <TenviIcon className="size-10 rounded-2xl shrink-0 shadow-xs" />
          <div className="group-data-[collapsible=icon]:hidden">
            <div className="text-xl font-extrabold tracking-tight text-foreground">Tenvi</div>
            <div className="text-xs text-muted-foreground font-medium">Personal Money Hub</div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={item.active}
                      tooltip={item.label}
                      render={<Link href={item.href} aria-current={item.active ? 'page' : undefined} />}
                      className={`h-11 rounded-2xl px-3.5 text-sm font-semibold transition-all ${
                        item.active
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="size-5 shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2">
        {/* User Card with Icon-only Theme Toggle */}
        <div className="p-2.5 rounded-2xl bg-muted/60 group-data-[collapsible=icon]:p-1.5 group-data-[collapsible=icon]:bg-transparent">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 group-data-[collapsible=icon]:justify-center">
              <div className="size-8 rounded-xl bg-card text-foreground shadow-xs flex items-center justify-center shrink-0">
                <User className="size-4" />
              </div>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <p className="text-xs font-bold text-foreground truncate">
                  {userName || 'Account'}
                </p>
                <p className="text-2xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            </div>
            <div className="group-data-[collapsible=icon]:hidden shrink-0">
              <ThemeQuickToggle />
            </div>
          </div>
        </div>

        {/* Collapsed view Theme Quick Toggle */}
        <div className="hidden group-data-[collapsible=icon]:flex justify-center">
          <ThemeQuickToggle />
        </div>

        {/* Log Out Button */}
        <form action={logoutAction} className="w-full">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 h-10 rounded-xl text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <LogOut className="size-4 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Log Out</span>
          </Button>
        </form>
      </SidebarFooter>

      <SidebarRail />
    </SidebarPrimitive>
  );
}
