'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { searchGlobalAction, SearchResultItem } from '@/app/actions/search';
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
  PlusCircle,
  Search,
  ArrowRight,
  Loader2,
  Car,
  User,
  ShieldCheck,
} from 'lucide-react';

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATIC_PAGES = [
  {
    title: 'Dashboard Overview',
    subtitle: 'Wealth summary, cash flow, and quick insights',
    href: '/dashboard',
    icon: LayoutDashboard,
    category: 'Pages',
  },
  {
    title: 'Money In & Out',
    subtitle: 'Track expenses, income, and transfers',
    href: '/dashboard/transactions',
    icon: Wallet,
    category: 'Pages',
  },
  {
    title: 'Savings & Cash',
    subtitle: 'Bank accounts, digital vaults, and emergency fund',
    href: '/dashboard/savings',
    icon: PiggyBank,
    category: 'Pages',
  },
  {
    title: 'Properties & Assets',
    subtitle: 'Real estate, vehicles, and fleet tracking',
    href: '/dashboard/properties',
    icon: Building2,
    category: 'Pages',
  },
  {
    title: 'Money Owed to Me',
    subtitle: 'Receivables and debtor ledgers',
    href: '/dashboard/receivables',
    icon: Coins,
    category: 'Pages',
  },
  {
    title: 'Credit Cards',
    subtitle: 'Card limits, balances, and optimal card to swipe',
    href: '/dashboard/cards',
    icon: CreditCard,
    category: 'Pages',
  },
  {
    title: 'Loans & Mortgages',
    subtitle: 'Personal loans, advances, and amortizations',
    href: '/dashboard/loans',
    icon: HandCoins,
    category: 'Pages',
  },
  {
    title: 'Split Bills',
    subtitle: 'Group dinners, shared purchases, and who chipped in',
    href: '/dashboard/splits',
    icon: Receipt,
    category: 'Pages',
  },
  {
    title: 'Alerts & Settings',
    subtitle: 'Notifications, export data, and account configuration',
    href: '/dashboard/settings',
    icon: Settings,
    category: 'Pages',
  },
];

const QUICK_ACTIONS = [
  {
    title: 'Record New Transaction',
    subtitle: 'Log an expense, income, or inter-vault transfer',
    href: '/dashboard/transactions',
    icon: PlusCircle,
  },
  {
    title: 'Add Credit Card',
    subtitle: 'Connect a new credit line or banking card',
    href: '/dashboard/cards',
    icon: CreditCard,
  },
  {
    title: 'Add Savings or Cash Account',
    subtitle: 'Add traditional bank, Maya, GCash, or physical cash',
    href: '/dashboard/savings',
    icon: PiggyBank,
  },
  {
    title: 'Add Property or Vehicle',
    subtitle: 'Track a new asset, taxi, Grab car, or condo',
    href: '/dashboard/properties',
    icon: Car,
  },
  {
    title: 'Record a Loan or Cash Advance',
    subtitle: 'Log money you lent to friends, relatives, or staff',
    href: '/dashboard/loans',
    icon: HandCoins,
  },
  {
    title: 'Split a Shared Bill',
    subtitle: 'Divide a dinner or group bill among friends',
    href: '/dashboard/splits',
    icon: Receipt,
  },
];

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, startTransition] = useTransition();

  // Listen for global ⌘K or Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Reset query when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSearchResults([]);
    }
  }, [open]);

  // Debounced live server search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await searchGlobalAction(trimmed);
        if (res.items) {
          setSearchResults(res.items);
        }
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange]
  );

  // Group search results by category
  const resultsByCategory = React.useMemo(() => {
    const map = new Map<string, SearchResultItem[]>();
    searchResults.forEach((item) => {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    });
    return map;
  }, [searchResults]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Global Search"
      description="Quick search across your transactions, cards, accounts, properties, loans, and pages"
    >
      <CommandInput
        placeholder="Search transactions, cards, accounts, properties, loans..."
        value={query}
        onValueChange={setQuery}
      />

      <CommandList className="max-h-[60vh] md:max-h-[420px] p-2 space-y-1">
        {isSearching && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Searching records...</span>
          </div>
        )}

        <CommandEmpty>
          {query.trim().length >= 2 ? (
            <div className="py-6 text-center space-y-1">
              <p className="text-sm font-semibold text-foreground">No records matched &quot;{query}&quot;</p>
              <p className="text-xs text-muted-foreground">
                Try searching by bank name, payee, note, or navigate using the options below.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">Type at least 2 characters to search your records</p>
          )}
        </CommandEmpty>

        {/* Live Search Results from Database */}
        {searchResults.length > 0 && (
          <>
            {Array.from(resultsByCategory.entries()).map(([cat, items]) => (
              <CommandGroup key={cat} heading={cat}>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.subtitle} ${cat}`}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <Badge variant="soft" className="text-2xs capitalize shrink-0 py-0 px-2 h-5">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                    <ArrowRight className="size-3.5 text-muted-foreground shrink-0 opacity-60" />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            <CommandSeparator className="my-2" />
          </>
        )}

        {/* Quick Navigation Pages */}
        <CommandGroup heading="Navigation Pages">
          {STATIC_PAGES.map((page) => {
            const Icon = page.icon;
            return (
              <CommandItem
                key={page.href}
                value={`${page.title} ${page.subtitle} page`}
                onSelect={() => handleSelect(page.href)}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-foreground text-sm block truncate">
                      {page.title}
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      {page.subtitle}
                    </span>
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground shrink-0 opacity-60" />
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator className="my-2" />

        {/* Quick Actions */}
        <CommandGroup heading="Quick Actions">
          {QUICK_ACTIONS.map((action, idx) => {
            const Icon = action.icon;
            return (
              <CommandItem
                key={idx}
                value={`${action.title} ${action.subtitle} action`}
                onSelect={() => handleSelect(action.href)}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-8 rounded-lg bg-muted text-foreground flex items-center justify-center shrink-0">
                    <Icon className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-foreground text-sm block truncate">
                      {action.title}
                    </span>
                    <span className="text-xs text-muted-foreground block truncate">
                      {action.subtitle}
                    </span>
                  </div>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground shrink-0 opacity-60" />
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
