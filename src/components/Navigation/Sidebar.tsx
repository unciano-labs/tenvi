'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TenviIcon } from '@/components/ui/TenviIcon';
import {
  Sidebar as SidebarPrimitive,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Wallet,
  PiggyBank,
  Building2,
  Coins,
  CreditCard,
  HandCoins,
  Receipt,
  Settings,
  LifeBuoy,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProps {
  userEmail?: string;
  userName?: string;
}

interface NavSection {
  heading: string;
  items: {
    label: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'HOME',
    items: [
      {
        label: 'Dashboard Overview',
        description: 'See your complete net worth and summary in one glance',
        href: '/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    heading: 'MONEY FLOW',
    items: [
      {
        label: 'Money In & Out',
        description: 'View daily spending, income, and transfers',
        href: '/dashboard/transactions',
        icon: Wallet,
      },
      {
        label: 'Savings & Cash',
        description: 'Bank accounts, emergency funds, and cash on hand',
        href: '/dashboard/savings',
        icon: PiggyBank,
      },
    ],
  },
  {
    heading: 'ASSETS & OWED',
    items: [
      {
        label: 'Properties & Assets',
        description: 'Real estate, vehicles, and physical valuations',
        href: '/dashboard/properties',
        icon: Building2,
      },
      {
        label: 'Money Owed to Me',
        description: 'Track receivables and money lent to friends/family',
        href: '/dashboard/receivables',
        icon: Coins,
      },
    ],
  },
  {
    heading: 'DEBTS & BILLS',
    items: [
      {
        label: 'Credit Cards',
        description: 'Card balances, limits, and optimal card to swipe',
        href: '/dashboard/cards',
        icon: CreditCard,
      },
      {
        label: 'Loans & Mortgages',
        description: 'Amortization schedules and debt repayments',
        href: '/dashboard/loans',
        icon: HandCoins,
      },
      {
        label: 'Split Bills',
        description: 'Shared group dinners and trips with friends',
        href: '/dashboard/splits',
        icon: Receipt,
      },
    ],
  },
  {
    heading: 'ACCOUNT',
    items: [
      {
        label: 'Alerts & Settings',
        description: 'Export data, notifications, and preferences',
        href: '/dashboard/settings',
        icon: Settings,
      },
      {
        label: 'Support & Tickets',
        description: 'Report bugs, request features, and track support',
        href: '/dashboard/support',
        icon: LifeBuoy,
      },
    ],
  },
];

export function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delay={200}>
      <SidebarPrimitive collapsible="icon" className="border-r border-border/60 bg-sidebar text-sidebar-foreground shadow-xs">
        {/* Brand Header */}
        <SidebarHeader className="p-4 sm:p-5 pb-3 group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:pb-2">
          <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:justify-center">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <TenviIcon className="size-9 rounded-xl shrink-0 shadow-xs" />
              <div className="group-data-[collapsible=icon]:hidden">
                <div className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                  Tenvi
                  <span className="text-[10px] leading-none font-semibold px-2 py-0.5 rounded-full bg-lightprimary text-primary whitespace-nowrap inline-flex items-center shrink-0">
                    Personal
                  </span>
                </div>
                <div className="text-2xs text-muted-foreground font-medium">Simple Wealth Hub</div>
              </div>
            </Link>
            <SidebarTrigger className="hidden md:flex text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer group-data-[collapsible=icon]:hidden size-8 rounded-lg" />
          </div>
        </SidebarHeader>

        {/* Categorized Navigation */}
        <SidebarContent className="px-3 py-2 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <SidebarGroup key={section.heading} className="p-0">
              <SidebarGroupLabel className="px-3 text-3xs font-bold uppercase tracking-wider text-muted-foreground/70 group-data-[collapsible=icon]:hidden mb-1">
                {section.heading}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href);

                    return (
                      <SidebarMenuItem key={item.href}>
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <SidebarMenuButton
                                isActive={isActive}
                                tooltip={item.label}
                                render={<Link href={item.href} aria-current={isActive ? 'page' : undefined} />}
                                className={`h-10 rounded-lg px-3 text-xs font-semibold transition-all cursor-pointer ${
                                  isActive
                                    ? 'bg-lightprimary text-primary font-bold shadow-xs'
                                    : 'text-muted-foreground hover:text-primary hover:bg-lightprimary/40'
                                }`}
                              />
                            }
                          >
                            <Icon className="size-4 shrink-0" />
                            <span className="group-data-[collapsible=icon]:hidden truncate">{item.label}</span>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="font-semibold">{item.label}</p>
                            <p className="text-2xs text-muted-foreground">{item.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarRail />
      </SidebarPrimitive>
    </TooltipProvider>
  );
}
