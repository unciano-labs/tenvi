'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import { TenviIcon } from '@/components/UI/TenviIcon';
import {
  LayoutDashboard,
  Wallet,
  PiggyBank,
  CreditCard,
  HandCoins,
  Receipt,
  Settings,
  Building2,
  LogOut,
  User,
  Coins,
} from 'lucide-react';

interface SidebarProps {
  userEmail?: string;
  userName?: string;
}

export function Sidebar({ userEmail, userName }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Overview',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      label: 'Money In & Out',
      href: '/dashboard/transactions',
      icon: Wallet,
      active: pathname.startsWith('/dashboard/transactions'),
    },
    {
      label: 'Receivables Hub',
      href: '/dashboard/receivables',
      icon: Coins,
      active: pathname.startsWith('/dashboard/receivables'),
    },
    {
      label: 'Properties & Assets',
      href: '/dashboard/properties',
      icon: Building2,
      active: pathname.startsWith('/dashboard/properties'),
    },
    {
      label: 'Savings & Cash',
      href: '/dashboard/savings',
      icon: PiggyBank,
      active: pathname.startsWith('/dashboard/savings'),
    },
    {
      label: 'Cards & Due Dates',
      href: '/dashboard/cards',
      icon: CreditCard,
      active: pathname.startsWith('/dashboard/cards'),
    },
    {
      label: 'People Who Owe You',
      href: '/dashboard/loans',
      icon: HandCoins,
      active: pathname.startsWith('/dashboard/loans'),
    },
    {
      label: 'Split Bills',
      href: '/dashboard/splits',
      icon: Receipt,
      active: pathname.startsWith('/dashboard/splits'),
    },
    {
      label: 'Alerts & Settings',
      href: '/dashboard/settings',
      icon: Settings,
      active: pathname.startsWith('/dashboard/settings'),
    },
  ];

  return (
    <aside className="w-64 bg-white flex flex-col justify-between p-6 shadow-sm h-full overflow-y-auto">
      <div>
        {/* Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 mb-10">
          <TenviIcon className="w-10 h-10 rounded-2xl shrink-0 shadow-sm" />
          <div>
            <div className="text-xl font-bold tracking-tight text-slate-900">Tenvi</div>
            <div className="text-xs text-slate-500 font-medium">Wealth OS</div>
          </div>
        </Link>

        {/* Navigation Items */}
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                  item.active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-[#F6F7F9]'
                }`}
              >
                <Icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-slate-500'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile card & logout */}
      <div className="pt-6">
        <div className="p-4 rounded-2xl bg-[#F6F7F9] mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {userName || 'Account'}
              </p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
          </div>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </form>
      </div>
    </aside>
  );
}
