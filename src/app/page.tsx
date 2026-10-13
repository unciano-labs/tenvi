import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TenviIcon } from '@/components/ui/TenviIcon';
import {
  Wallet,
  CreditCard,
  HandCoins,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  PiggyBank,
} from 'lucide-react';

import { ThemeQuickToggle } from '@/components/ui/theme-toggle';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-20 sm:pb-32">
      {/* Top Navbar */}
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <TenviIcon className="size-10 rounded-2xl shrink-0 shadow-xs" />
          <div className="min-w-0">
            <span className="text-xl font-bold tracking-tight text-foreground">Tenvi</span>
            <Badge variant="soft" className="hidden sm:inline-flex ml-2 text-2xs font-semibold">
              Personal Money Hub
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeQuickToggle />
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-xs font-semibold')}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'text-xs font-semibold gap-1.5 shadow-xs')}
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <Badge variant="soft" className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Simple, safe, and easy-to-use personal money manager
        </Badge>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.18] mb-6">
          Manage your daily spending, bills &amp; savings{' '}
          <span className="text-muted-foreground font-semibold block sm:inline">with total peace of mind.</span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed font-normal">
          Tenvi helps you easily record everyday spending, keep track of upcoming card due dates, and monitor your emergency savings in one clear, simple screen — no confusing finance jargon.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className={cn(buttonVariants({ variant: 'default', size: 'lg' }), 'w-full sm:w-auto px-8 gap-2 font-semibold shadow-xs')}
          >
            Create Your Free Account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: 'soft', size: 'lg' }), 'w-full sm:w-auto px-8 font-medium')}
          >
            Sign In to Your Account
          </Link>
        </div>
      </section>

      {/* 4 Core Pillars */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
            Everything in One Simple Place
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Track daily expenses, see upcoming bills, and watch your savings grow comfortably.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Daily Cash Flow */}
          <Card className="p-8 shadow-xs hover:shadow-lift transition-shadow flex flex-col justify-between">
            <div className="min-w-0">
              <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Daily Cash Flow Tracking</h3>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                Effortlessly track every peso coming in and going out across cash, e-wallets, bank accounts, and credit cards with instant 1-tap categorizations.
              </p>
            </div>
            <div className="mt-6 p-4 rounded-2xl bg-muted/60 flex items-center justify-between gap-2 min-w-0">
              <span className="text-xs font-medium text-muted-foreground truncate">Real-time ledger</span>
              <Badge variant="success" className="text-2xs font-semibold shrink-0">
                Liquid Cash Flow
              </Badge>
            </div>
          </Card>

          {/* 2. Credit Card & Debt Amortization */}
          <Card className="p-8 shadow-xs hover:shadow-lift transition-shadow flex flex-col justify-between">
            <div className="min-w-0">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Credit &amp; Debt Amortization</h3>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                Monitor total spending power across cards, statement cutoff cycles, and payment countdowns. Receive automated daily alerts via Gmail SMTP &amp; SMS before due dates.
              </p>
            </div>
            <div className="mt-6 p-4 rounded-2xl bg-muted/60 flex items-center justify-between gap-2 min-w-0">
              <span className="text-xs font-medium text-muted-foreground truncate">Debt payoff acceleration</span>
              <Badge variant="soft" className="text-2xs font-semibold shrink-0">
                Zero Late Fees
              </Badge>
            </div>
          </Card>

          {/* 3. Loans & Receivables */}
          <Card className="p-8 shadow-xs hover:shadow-lift transition-shadow flex flex-col justify-between">
            <div className="min-w-0">
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <HandCoins className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Friendly Loans &amp; Receivables</h3>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                Manage money lent to friends, relatives, or partners. Full installment schedules (3 to 60 months), partial repayments, downpayments, and borrower notification alerts.
              </p>
            </div>
            <div className="mt-6 p-4 rounded-2xl bg-muted/60 flex items-center justify-between gap-2 min-w-0">
              <span className="text-xs font-medium text-muted-foreground truncate">Complete payment schedules</span>
              <Badge variant="soft" className="text-2xs font-semibold shrink-0">
                Traceable Loans
              </Badge>
            </div>
          </Card>

          {/* 4. Automated Savings & Equity Targets */}
          <Card className="p-8 shadow-xs hover:shadow-lift transition-shadow flex flex-col justify-between">
            <div className="min-w-0">
              <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6">
                <PiggyBank className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Automated Savings &amp; Asset Equity</h3>
              <p className="text-muted-foreground leading-relaxed text-sm sm:text-base">
                Set dedicated vaults for emergency funds, investments, and long-term asset accumulation with automated deposit schedules and net worth progress.
              </p>
            </div>
            <div className="mt-6 p-4 rounded-2xl bg-muted/60 flex items-center justify-between gap-2 min-w-0">
              <span className="text-xs font-medium text-muted-foreground truncate">Long-term equity growth</span>
              <Badge variant="warning" className="text-2xs font-semibold shrink-0">
                Asset Building
              </Badge>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 pt-16 pb-12 sm:pb-16 text-center text-xs text-muted-foreground">
        <p className="flex items-center justify-center gap-1.5 mb-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Encrypted &amp; Isolated. Built on enterprise cloud infrastructure.
        </p>
        <p>© {new Date().getFullYear()} Tenvi. All-in-One Personal Wealth Infrastructure Platform.</p>
      </footer>
    </main>
  );
}
