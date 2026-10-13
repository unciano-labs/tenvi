import {
  LayoutDashboard,
  Wallet,
  Coins,
  Building2,
  PiggyBank,
  CreditCard,
  HandCoins,
  Receipt,
  Settings,
  Bell,
  type LucideIcon,
} from 'lucide-react';

export interface NavItemConfig {
  label: string;
  mobileLabel?: string;
  href: string;
  icon: LucideIcon;
}

export const MAIN_NAV_ITEMS: NavItemConfig[] = [
  {
    label: 'Overview',
    mobileLabel: 'Home',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Money In & Out',
    mobileLabel: 'Spending',
    href: '/dashboard/transactions',
    icon: Wallet,
  },
  {
    label: 'Money Owed to Me',
    mobileLabel: 'Receivables',
    href: '/dashboard/receivables',
    icon: Coins,
  },
  {
    label: 'Properties & Assets',
    mobileLabel: 'Assets',
    href: '/dashboard/properties',
    icon: Building2,
  },
  {
    label: 'Savings & Cash',
    mobileLabel: 'Savings',
    href: '/dashboard/savings',
    icon: PiggyBank,
  },
  {
    label: 'Credit Cards',
    mobileLabel: 'Credit Cards',
    href: '/dashboard/cards',
    icon: CreditCard,
  },
  {
    label: 'Loans & Debts',
    mobileLabel: 'Loans',
    href: '/dashboard/loans',
    icon: HandCoins,
  },
  {
    label: 'Split Bills',
    mobileLabel: 'Splits',
    href: '/dashboard/splits',
    icon: Receipt,
  },
  {
    label: 'Alerts & Settings',
    mobileLabel: 'Alerts',
    href: '/dashboard/settings',
    icon: Settings,
  },
];

export const MOBILE_BOTTOM_NAV_ITEMS: NavItemConfig[] = [
  MAIN_NAV_ITEMS[0], // Overview
  MAIN_NAV_ITEMS[1], // Money In & Out
  MAIN_NAV_ITEMS[5], // Credit Cards
  MAIN_NAV_ITEMS[4], // Savings & Cash
  MAIN_NAV_ITEMS[6], // Loans & Debts
];

