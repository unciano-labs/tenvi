'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  PiggyBank,
  CreditCard,
  Building2,
  HandCoins,
  Receipt,
  Bell,
  Coins,
} from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Home',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      label: 'Spending',
      href: '/dashboard/transactions',
      icon: Wallet,
      active: pathname.startsWith('/dashboard/transactions'),
    },
    {
      label: 'Receivables',
      href: '/dashboard/receivables',
      icon: Coins,
      active: pathname.startsWith('/dashboard/receivables'),
    },
    {
      label: 'Assets',
      href: '/dashboard/properties',
      icon: Building2,
      active: pathname.startsWith('/dashboard/properties'),
    },
    {
      label: 'Savings',
      href: '/dashboard/savings',
      icon: PiggyBank,
      active: pathname.startsWith('/dashboard/savings'),
    },
    {
      label: 'Cards',
      href: '/dashboard/cards',
      icon: CreditCard,
      active: pathname.startsWith('/dashboard/cards'),
    },
    {
      label: 'Loans',
      href: '/dashboard/loans',
      icon: HandCoins,
      active: pathname.startsWith('/dashboard/loans'),
    },
    {
      label: 'Splits',
      href: '/dashboard/splits',
      icon: Receipt,
      active: pathname.startsWith('/dashboard/splits'),
    },
    {
      label: 'Alerts',
      href: '/dashboard/settings',
      icon: Bell,
      active: pathname.startsWith('/dashboard/settings'),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-lg border-t border-slate-200/60 z-40 flex items-center gap-1 overflow-x-auto no-scrollbar">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center shrink-0 min-w-[62px] gap-1 py-1.5 px-2 rounded-2xl text-xs font-medium transition-all cursor-pointer ${
              item.active
                ? 'text-slate-900 bg-slate-100 font-semibold shadow-2xs'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <Icon className={`w-5 h-5 ${item.active ? 'text-slate-900' : 'text-slate-400'}`} />
            <span className="text-[11px] leading-tight whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
