'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  SlidersHorizontal,
  BarChart3,
  ArrowLeft,
  LogOut,
  ShieldAlert,
  Megaphone,
} from 'lucide-react';
import { TenviIcon } from '@/components/ui/TenviIcon';
import { logoutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';

export const ADMIN_NAV_ITEMS = [
  {
    label: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'System health & operational snapshot',
  },
  {
    label: 'Members Directory',
    href: '/admin/members',
    icon: Users,
    description: 'Manage accounts & inspect audit trails',
  },
  {
    label: 'Email Broadcast',
    href: '/admin/broadcast',
    icon: Megaphone,
    description: 'Send announcements & email blasts to members',
  },
  {
    label: 'Feedback Inbox',
    href: '/admin/feedback',
    icon: MessageSquare,
    description: 'Member bugs & feature requests',
  },
  {
    label: 'Developer Settings',
    href: '/admin/settings',
    icon: SlidersHorizontal,
    description: 'Maintenance modes, quotas & crons',
  },
  {
    label: 'Analytics & Funnels',
    href: '/admin/analytics',
    icon: BarChart3,
    description: 'Privacy-safe traffic & retention metrics',
  },
];

interface AdminSidebarProps {
  userEmail: string;
}

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-border/60 bg-card/60 backdrop-blur-md shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-border/50 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3">
          <TenviIcon className="size-8 rounded-xl shadow-xs" />
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">Tenvi</span>
              <span className="px-1.5 py-0.5 text-3xs font-extrabold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded">
                Admin
              </span>
            </div>
            <span className="text-3xs text-muted-foreground block font-medium">Control Plane</span>
          </div>
        </Link>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-1 text-3xs font-bold tracking-wider text-muted-foreground uppercase">
          Administration
        </div>
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/70'
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Switcher & Account */}
      <div className="p-3 border-t border-border/50 space-y-2 bg-muted/20">
        {/* Switch back to Personal Wealth Hub */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary hover:bg-lightprimary transition-colors"
        >
          <ArrowLeft className="size-4 shrink-0" />
          <div className="flex flex-col text-left min-w-0">
            <span className="text-xs font-bold truncate">Personal Vault</span>
            <span className="text-3xs text-muted-foreground truncate">Back to Money Hub</span>
          </div>
        </Link>

        {/* User Info & Logout */}
        <div className="pt-2 border-t border-border/40 flex items-center justify-between px-1">
          <div className="flex flex-col min-w-0 pr-2">
            <span className="text-2xs font-bold text-foreground truncate">{userEmail}</span>
            <span className="text-3xs text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
              <ShieldAlert className="size-2.5 inline" /> Superadmin
            </span>
          </div>
          <form action={logoutAction}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
              aria-label="Log Out"
            >
              <LogOut className="size-3.5" />
            </Button>
          </form>
        </div>
      </div>
    </aside>
  );
}
