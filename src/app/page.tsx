import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TenviIcon } from '@/components/ui/TenviIcon';
import {
  CreditCard,
  Building2,
  Car,
  FileCheck2,
  CalendarClock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Clock,
  Send,
  ImagePlus,
  Lightbulb,
} from 'lucide-react';

import { ThemeQuickToggle } from '@/components/ui/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tenvi — Unified Personal Wealth, Credit & Asset Management',
  description:
    'Replace scattered spreadsheets. Tenvi unifies daily cash flow, credit card intelligence, loan amortizations, and vehicle/property portfolio management in one screen.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'Tenvi — Personal Wealth Infrastructure & Financial Copilot',
    description:
      'Unify daily cash flow, credit card intelligence, loan amortizations, and vehicle/property portfolio management in one clean system.',
    url: 'https://tenvi.app',
    siteName: 'Tenvi',
    images: [
      {
        url: '/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Tenvi Wealth Infrastructure',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
};

interface HomePageProps {
  searchParams?: Promise<{ preview?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedParams = searchParams ? await searchParams : undefined;
  const isPreview = resolvedParams?.preview === 'landing' || resolvedParams?.preview === 'true';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !isPreview) {
    redirect('/dashboard');
  }

  // Structured Data (JSON-LD) for Search Engine Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': 'https://tenvi.app/#website',
        url: 'https://tenvi.app',
        name: 'Tenvi',
        description: 'Unified Personal Wealth Infrastructure & Financial Copilot',
        publisher: {
          '@type': 'Organization',
          name: 'Tenvi',
          logo: {
            '@type': 'ImageObject',
            url: 'https://tenvi.app/icon-512.png',
          },
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': 'https://tenvi.app/#software',
        name: 'Tenvi',
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'All',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        description:
          'Unified digital ledger tracking daily cash flow, automated savings targets, loan amortization, credit card intelligence, and real-time asset valuations.',
        featureList: [
          'Real-Time Cash Flow & Multi-Account Ledger',
          'Credit Card Utilization & Statement Cycle Tracking',
          'Property, Vehicle & Boundary Rental Income Tracking',
          'Commitment & Amortization Run-Rate Visibility',
          'Automated Expiration Alerts for Permitting & Insurance',
          'Tenvi AI Natural Language Financial Copilot',
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden flex flex-col selection:bg-slate-200 dark:selection:bg-slate-800">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full h-16 border-b border-border/40 bg-background/80 backdrop-blur-md transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <TenviIcon variant="solid" className="w-8 h-8 rounded-xl shadow-xs" />
            <span className="text-xl font-bold tracking-tight text-foreground">Tenvi</span>
          </Link>

          {/* Center Navigation Links (Hidden on mobile) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#solutions" className="hover:text-foreground transition-colors">
              Solutions
            </a>
            <a href="#tenvi-ai" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <span>Tenvi AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </a>
            <a href="#security" className="hover:text-foreground transition-colors">
              Security
            </a>
          </nav>

          {/* Action CTA & Theme Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <ThemeQuickToggle />
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: 'ghost', size: 'sm' }),
                'text-sm font-medium rounded-xl hidden sm:inline-flex'
              )}
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                'text-sm font-semibold rounded-xl gap-1.5 px-3.5 sm:px-4 shadow-xs'
              )}
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {/* =========================================================================
            1. HERO SECTION (STRICTLY NO EYEBROW)
            ========================================================================= */}
        <section className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          {/* Subtle Ambient Background Glow */}
          <div
            aria-hidden="true"
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-[500px] h-[300px] bg-primary/10 dark:bg-primary/5 blur-3xl rounded-full pointer-events-none"
          />

          <div className="max-w-4xl mx-auto">
            {/* Strictly No Eyebrow Badge / Pill above H1 */}
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight">
              Personal Wealth, Credit Intelligence &amp; Asset Portfolios. Unified.
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground mt-4 max-w-2xl mx-auto leading-relaxed">
              Replace scattered spreadsheets. Tenvi integrates daily cash flow, credit card billing cycles, loan amortizations, and vehicle/property equity into a single automated command center.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'h-11 px-6 rounded-xl font-semibold shadow-md gap-2 text-sm'
                )}
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#solutions"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-11 px-6 rounded-xl font-medium border-border/80 text-sm hover:bg-muted/60'
                )}
              >
                Take 1-Min Tour
              </a>
            </div>
          </div>

          {/* Clean Dashboard Preview Card */}
          <div className="mt-12 md:mt-16 text-left">
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-xl space-y-6">
              {/* Preview Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <TenviIcon variant="solid" className="w-7 h-7 rounded-lg" />
                  <div>
                    <div className="text-sm font-semibold text-foreground">Financial Command Center</div>
                    <div className="text-xs text-muted-foreground">Consolidated real-time balance</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Net Worth: ₱2,485,320 (+8.4% YTD)
                  </span>
                </div>
              </div>

              {/* 3 Core Metric Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Liquid Cash */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-primary" />
                      Liquid Cash &amp; Reserves
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-foreground">₱342,850</div>
                  <div className="text-xs text-muted-foreground">Spread across 3 bank vaults &amp; e-wallets</div>
                </div>

                {/* 2. Credit Utilization */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-primary" />
                      Revolving Credit
                    </span>
                    <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      21% Ratio
                    </span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    ₱48,200 <span className="text-xs font-normal text-muted-foreground">/ ₱230k Limit</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Zero interest float • Cutoff in 3 days</div>
                </div>

                {/* 3. Physical Asset Equity */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/40 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-primary" />
                      Asset &amp; Fleet Equity
                    </span>
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      +₱64.3k/mo Net
                    </span>
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-foreground">₱2,142,470</div>
                  <div className="text-xs text-muted-foreground">2 properties + 3 commercial vehicles</div>
                </div>
              </div>

              {/* Recommended Float Strategy Banner */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-foreground font-medium">
                  <Clock className="w-4 h-4 text-primary shrink-0" />
                  <span>
                    Optimal swipe: <strong>BDO Titanium</strong> provides 52 days of interest-free float today.
                  </span>
                </div>
                <div className="text-muted-foreground flex items-center gap-1.5">
                  <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>LTO vehicle inspection due in 14 days</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. CORE PROBLEM & SOLUTION CARDS (STRICT 3-COLUMN RESPONSIVE GRID)
            ========================================================================= */}
        <section id="solutions" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border/40">
          <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Built for Real-World Complexity
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Standard budgeting apps only categorize backward-looking expenses. Tenvi tracks the three critical pillars of personal and commercial solvency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Credit Cards */}
            <div className="p-6 rounded-2xl border border-border/60 bg-card flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Credit Card Intelligence</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Track statement cutoffs, interest-free float windows, and revolving debt utilization across all cards without spreadsheet formulas.
                  </p>
                </div>
                <ul className="space-y-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Statement cutoff vs. due date intel
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Under 30% utilization health alerts
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Swipe-for-others reimbursement tracker
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Benefit</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Zero Late Fees &amp; Max Float</span>
              </div>
            </div>

            {/* Card 2: Vehicles & Properties */}
            <div className="p-6 rounded-2xl border border-border/60 bg-card flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Vehicles &amp; Property Fleets</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Monitor income-generating assets, daily boundary collections, tenant rents, and unit-level maintenance costs in dedicated operating ledgers.
                  </p>
                </div>
                <ul className="space-y-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Daily driver remittance &amp; rent logs
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Operating maintenance &amp; fuel deductions
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Per-asset net yield &amp; equity valuation
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Benefit</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Accurate ROI &amp; Net Yield</span>
              </div>
            </div>

            {/* Card 3: Commitments & Compliance */}
            <div className="p-6 rounded-2xl border border-border/60 bg-card flex flex-col justify-between space-y-5">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-primary">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Commitments &amp; Compliance</h3>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Eliminate cash flow spikes by amortizing annual insurance, vehicle registration renewals, and loan payments month-to-month.
                  </p>
                </div>
                <ul className="space-y-2 pt-2 border-t border-border/40 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Monthly run-rate sinking fund calculation
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    60/30/15-day document expiration reminders
                  </li>
                  <li className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Principal vs. interest amortization breakdown
                  </li>
                </ul>
              </div>
              <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Benefit</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">Zero Penalties &amp; Predictability</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            3. TENVI AI SECTION (CLEAN 2-COLUMN SPLIT)
            ========================================================================= */}
        <section id="tenvi-ai" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border/40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            {/* Left Column: Context & Explanations */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Financial AI Copilot</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                Instant Financial Clarity. Zero Math Required.
              </h2>

              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Tenvi AI connects directly to your active ledger, statement cycles, and asset portfolios. Ask questions in natural language and receive verified recommendations instantly.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Card Cycle &amp; Float Optimization</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Identifies which card offers up to 55 days of free float based on statement cutoffs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Car className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Fleet &amp; Property Cash Flow Audits</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Calculates net yields across boundary remittances, rental inflows, and maintenance expenses.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <CalendarClock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Run-Rate &amp; Obligation Projections</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Verifies reserve coverage for approaching loan amortizations and insurance premiums.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  href="/register"
                  className={cn(
                    buttonVariants({ variant: 'default', size: 'lg' }),
                    'h-11 px-6 rounded-xl font-semibold gap-2 shadow-xs text-sm'
                  )}
                >
                  <span>Experience Tenvi AI</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Column: Static Chat Preview Card Matching Redesigned Modal */}
            <div className="rounded-2xl border border-border/60 bg-card shadow-2xl overflow-hidden flex flex-col">
              {/* Minimalist Header */}
              <div className="px-4 py-3 bg-muted/30 border-b border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TenviIcon variant="solid" className="w-7 h-7 rounded-lg shadow-2xs" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-foreground">Tenvi AI</span>
                      <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">Financial Assistant</span>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">Live Context</span>
              </div>

              {/* Chat Body */}
              <div className="p-4 sm:p-5 space-y-4">
                {/* User Prompt */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-primary text-primary-foreground px-3.5 py-2.5 rounded-2xl rounded-tr-xs text-xs sm:text-sm font-medium shadow-2xs">
                    Which credit card should I use for a ₱15,000 purchase today?
                  </div>
                </div>

                {/* AI Response Card */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 bg-muted/40 border border-border/50 rounded-2xl rounded-tl-xs p-3.5 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <span className="text-xs font-bold text-foreground">
                        Recommended: BDO Titanium Mastercard
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Optimal
                      </span>
                    </div>

                    {/* Compact Metrics */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 rounded-lg bg-background/80 border border-border/40 text-center">
                        <div className="text-[10px] text-muted-foreground">Free Float</div>
                        <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">52 Days</div>
                      </div>
                      <div className="p-2 rounded-lg bg-background/80 border border-border/40 text-center">
                        <div className="text-[10px] text-muted-foreground">Available</div>
                        <div className="text-xs font-bold text-foreground">₱145k</div>
                      </div>
                      <div className="p-2 rounded-lg bg-background/80 border border-border/40 text-center">
                        <div className="text-[10px] text-muted-foreground">Utilization</div>
                        <div className="text-xs font-bold text-foreground">18%</div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your statement cut off yesterday. Swiping today grants 52 days of interest-free float until your due date.
                    </p>

                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
                      <strong>Pro-tip:</strong> Avoid Citi today—cutoff is in 36 hours.
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Input Bar Preview */}
              <div className="p-3 bg-muted/20 border-t border-border/40">
                <div className="rounded-xl bg-background border border-border/60 p-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground pl-1">Ask a question or log spending...</span>
                  <div className="flex items-center gap-1">
                    <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      <ImagePlus className="w-3.5 h-3.5" />
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-2xs">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            4. SECURITY & DATA INTEGRITY
            ========================================================================= */}
        <section id="security" className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border/40">
          <div className="rounded-2xl border border-border/60 bg-card p-8 sm:p-12 text-center max-w-3xl mx-auto space-y-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Privacy-First Financial Infrastructure
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
                Your financial records belong exclusively to you. Built on top of enterprise PostgreSQL with strict Row Level Security (RLS), continuous TLS encryption in transit, and AES-256 encryption at rest.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-semibold text-muted-foreground max-w-lg mx-auto">
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                🔒 Strict Row Level Isolation
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                ⚡ Zero Third-Party Tracking
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border/40">
                🛡️ Automated Daily Backups
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            5. FINAL CALL TO ACTION
            ========================================================================= */}
        <section className="py-16 md:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-border/40 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Ready to Upgrade Your Financial Infrastructure?
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Join individuals, freelancers, and asset owners who have replaced scattered spreadsheets with automated clarity.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'h-11 px-6 rounded-xl font-semibold shadow-md gap-2 text-sm'
                )}
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-11 px-6 rounded-xl font-medium border-border/80 text-sm'
                )}
              >
                Sign In to Vault
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Minimalist Footer */}
      <footer className="border-t border-border/40 py-10 bg-background text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <TenviIcon variant="solid" className="w-6 h-6 rounded-lg" />
            <span className="font-bold text-foreground">Tenvi Platform</span>
            <span>•</span>
            <span>All-in-One Personal Wealth Infrastructure</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#solutions" className="hover:text-foreground transition-colors">
              Solutions
            </a>
            <a href="#tenvi-ai" className="hover:text-foreground transition-colors">
              Tenvi AI
            </a>
            <a href="#security" className="hover:text-foreground transition-colors">
              Security
            </a>
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
          </div>

          <div>
            <p>© {new Date().getFullYear()} Tenvi Labs. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
