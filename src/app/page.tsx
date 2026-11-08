import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { TenviIcon } from '@/components/ui/TenviIcon';
import {
  CreditCard,
  Car,
  FileCheck2,
  CalendarClock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Wallet,
  Clock,
  Send,
  ImagePlus,
  Lock,
  EyeOff,
  DatabaseBackup,
} from 'lucide-react';

import { ThemeQuickToggle } from '@/components/ui/theme-toggle';
import { buttonVariants } from '@/components/ui/button';
import { VoiceAgentWidget } from '@/components/Widgets/VoiceAgentWidget';
import { cn } from '@/lib/utils';
import { APP_URL } from '@/lib/constants';
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
    url: APP_URL,
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

const NAV_LINK =
  'inline-flex min-h-11 items-center whitespace-nowrap rounded-lg px-3 hover:text-foreground transition-colors duration-(--motion-fast) ease-(--ease-in-out) outline-none focus-visible:ring-2 focus-visible:ring-ring';

const PILLARS = [
  {
    icon: CreditCard,
    title: 'Credit card intelligence',
    body: 'Track statement cutoffs, interest-free float windows, and revolving debt utilization across all cards without spreadsheet formulas.',
    points: [
      'Statement cutoff vs. due date intel',
      'Under 30% utilization health alerts',
      'Swipe-for-others reimbursement tracker',
    ],
    benefit: 'Zero late fees & max float',
    wide: false,
  },
  {
    icon: Car,
    title: 'Vehicles & property fleets',
    body: 'Monitor income-generating assets, daily boundary collections, tenant rents, and unit-level maintenance costs in dedicated operating ledgers.',
    points: [
      'Daily driver remittance & rent logs',
      'Operating maintenance & fuel deductions',
      'Per-asset net yield & equity valuation',
    ],
    benefit: 'Accurate ROI & net yield',
    wide: false,
  },
  {
    icon: CalendarClock,
    title: 'Commitments & compliance',
    body: 'Eliminate cash flow spikes by amortizing annual insurance, vehicle registration renewals, and loan payments month-to-month.',
    points: [
      'Monthly run-rate sinking fund calculation',
      '60/30/15-day document expiration reminders',
      'Principal vs. interest amortization breakdown',
    ],
    benefit: 'Zero penalties & predictability',
    wide: true,
  },
];

const AI_CAPABILITIES = [
  {
    icon: CreditCard,
    title: 'Card cycle & float optimization',
    body: 'Identifies which card offers up to 55 days of free float based on statement cutoffs.',
  },
  {
    icon: Car,
    title: 'Fleet & property cash flow audits',
    body: 'Calculates net yields across boundary remittances, rental inflows, and maintenance expenses.',
  },
  {
    icon: CalendarClock,
    title: 'Run-rate & obligation projections',
    body: 'Verifies reserve coverage for approaching loan amortizations and insurance premiums.',
  },
];

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
        '@id': `${APP_URL}/#website`,
        url: APP_URL,
        name: 'Tenvi',
        description: 'Unified Personal Wealth Infrastructure & Financial Copilot',
        publisher: {
          '@type': 'Organization',
          name: 'Tenvi',
          logo: {
            '@type': 'ImageObject',
            url: `${APP_URL}/icon-512.png`,
          },
        },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${APP_URL}/#software`,
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
    <div className="min-h-dvh bg-background text-foreground overflow-x-clip flex flex-col selection:bg-primary/15">
      {/* Voice Agent Widget */}
      <script
        src="https://telli-six.vercel.app/widget.js"
        data-key="wk_SL5rtc77Z1lM-xX1"
        async
      />
      {/* Authorized Voice Agent Widget */}
      <VoiceAgentWidget currentPath="/" />

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <TenviIcon variant="solid" className="w-8 h-8 rounded-xl shadow-xs" />
            <span className="text-xl font-bold tracking-tight text-foreground">Tenvi</span>
          </Link>

          {/* Center Navigation Links (Hidden on mobile) */}
          <nav aria-label="Primary" className="hidden lg:flex items-center gap-1 text-sm font-medium text-muted-foreground">
            <a href="#features" className={NAV_LINK}>
              Features
            </a>
            <a href="#solutions" className={NAV_LINK}>
              Solutions
            </a>
            <a href="#tenvi-ai" className={cn(NAV_LINK, 'gap-1.5')}>
              <span>Tenvi AI</span>
              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-success" />
            </a>
            <a href="#security" className={NAV_LINK}>
              Security
            </a>
          </nav>

          {/* Action CTA & Theme Toggle */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <ThemeQuickToggle />
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'px-3 text-sm')}
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'px-3.5 sm:px-4 text-sm gap-1.5')}
            >
              <span>Get started</span>
              <ArrowRight className="hidden sm:block w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        {/* =========================================================================
            1. HERO SECTION (STRICTLY NO EYEBROW)
            ========================================================================= */}
        <section className="pt-14 pb-16 sm:pt-24 sm:pb-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-[clamp(2rem,1.35rem+3.2vw,3.5rem)] font-bold leading-[1.06] tracking-[-0.032em] text-foreground">
              Personal wealth, credit intelligence &amp; asset portfolios. Unified.
            </h1>

            <p className="mt-5 max-w-prose mx-auto text-base sm:text-lg leading-relaxed text-muted-foreground">
              Replace scattered spreadsheets. Tenvi integrates daily cash flow, credit card billing cycles, loan amortizations, and vehicle/property equity into a single automated command center.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register" className={cn(buttonVariants({ variant: 'default' }), 'px-6')}>
                <span>Get started free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#solutions" className={cn(buttonVariants({ variant: 'ghost' }), 'px-6 text-foreground')}>
                Take the 1-min tour
              </a>
            </div>
          </div>

          {/* Product preview — the page's one feature surface */}
          <div
            id="features"
            className="mt-14 sm:mt-20 scroll-mt-24 rounded-3xl bg-card p-5 sm:p-8 shadow-overlay flex flex-col gap-6"
          >
            {/* Preview Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <TenviIcon variant="solid" className="w-9 h-9 rounded-xl shrink-0" />
                <div className="min-w-0">
                  <div className="text-base font-semibold text-foreground">Financial command center</div>
                  <div className="text-sm text-muted-foreground">Consolidated real-time balance</div>
                </div>
              </div>
              <span className="num inline-flex items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-sm font-semibold text-success-soft-foreground">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-success" />
                Net worth: ₱2,485,320 (+8.4% YTD)
              </span>
            </div>

            {/* 3 Core Metric Wells */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* 1. Liquid Cash */}
              <div className="min-w-0 rounded-2xl bg-muted/50 p-4 sm:p-5 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-medium flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 shrink-0 text-primary" />
                    Liquid cash &amp; reserves
                  </span>
                  <span className="text-2xs font-semibold text-success-soft-foreground bg-success-soft px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <div className="num text-figure text-foreground">₱342,850</div>
                <div className="text-sm text-muted-foreground">Spread across 3 bank vaults &amp; e-wallets</div>
              </div>

              {/* 2. Credit Utilization */}
              <div className="min-w-0 rounded-2xl bg-muted/50 p-4 sm:p-5 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-medium flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 shrink-0 text-primary" />
                    Revolving credit
                  </span>
                  <span className="num text-2xs font-semibold text-primary bg-lightprimary px-2 py-0.5 rounded-full">
                    21% ratio
                  </span>
                </div>
                <div className="num text-figure text-foreground">
                  ₱48,200 <span className="text-sm font-normal tracking-normal text-muted-foreground">/ ₱230k limit</span>
                </div>
                <div className="text-sm text-muted-foreground">Zero interest float • Cutoff in 3 days</div>
              </div>

              {/* 3. Physical Asset Equity */}
              <div className="min-w-0 rounded-2xl bg-muted/50 p-4 sm:p-5 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-medium flex items-center gap-1.5">
                    <Car className="w-4 h-4 shrink-0 text-primary" />
                    Asset &amp; fleet equity
                  </span>
                  <span className="num text-2xs font-semibold text-warning-soft-foreground bg-warning-soft px-2 py-0.5 rounded-full">
                    +₱64.3k/mo net
                  </span>
                </div>
                <div className="num text-figure text-foreground">₱2,142,470</div>
                <div className="text-sm text-muted-foreground">2 properties + 3 commercial vehicles</div>
              </div>
            </div>

            {/* Recommended Float Strategy Banner */}
            <div className="rounded-2xl bg-lightprimary px-4 py-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
              <div className="flex items-start gap-2 text-foreground font-medium min-w-0">
                <Clock className="mt-0.5 w-4 h-4 text-primary shrink-0" />
                <span>
                  Optimal swipe: <strong>BDO Titanium</strong> provides 52 days of interest-free float today.
                </span>
              </div>
              <div className="text-muted-foreground flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 shrink-0 text-success" />
                <span>LTO vehicle inspection due in 14 days</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            2. CORE PROBLEM & SOLUTION CARDS
            ========================================================================= */}
        <section id="solutions" className="scroll-mt-16 py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
            <h2 className="text-[clamp(1.625rem,1.25rem+1.6vw,2.375rem)] font-bold leading-[1.12] tracking-[-0.025em] text-foreground">
              Built for real-world complexity
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed">
              Standard budgeting apps only categorize backward-looking expenses. Tenvi tracks the three critical pillars of personal and commercial solvency.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article
                  key={pillar.title}
                  className={cn(
                    'min-w-0 rounded-2xl bg-card p-6 shadow-card flex flex-col gap-5',
                    pillar.wide && 'md:col-span-2 lg:col-span-1'
                  )}
                >
                  <div className="w-10 h-10 rounded-xl bg-lightprimary flex items-center justify-center text-primary">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-title text-foreground">{pillar.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
                  </div>
                  <ul className="flex flex-col gap-2.5 text-sm font-medium text-foreground">
                    {pillar.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5">
                        <span aria-hidden="true" className="mt-2 w-1.5 h-1.5 shrink-0 rounded-full bg-success" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-col gap-0.5 rounded-xl bg-muted/50 px-4 py-3 text-sm">
                    <span className="text-label text-muted-foreground">Benefit</span>
                    <span className="font-semibold text-success">{pillar.benefit}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* =========================================================================
            3. TENVI AI SECTION (CLEAN 2-COLUMN SPLIT)
            ========================================================================= */}
        <section id="tenvi-ai" className="scroll-mt-16 py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column: Context & Explanations */}
            <div className="min-w-0 flex flex-col gap-6">
              <div className="flex flex-col gap-4">
                <span className="inline-flex items-center gap-2 text-label font-semibold text-success-soft-foreground">
                  <Sparkles className="w-4 h-4" />
                  Financial AI copilot
                </span>
                <h2 className="text-[clamp(1.625rem,1.25rem+1.6vw,2.375rem)] font-bold leading-[1.12] tracking-[-0.025em] text-foreground">
                  Instant financial clarity. Zero math required.
                </h2>
                <p className="max-w-prose text-base text-muted-foreground leading-relaxed">
                  Tenvi AI connects directly to your active ledger, statement cycles, and asset portfolios. Ask questions in natural language and receive verified recommendations instantly.
                </p>
              </div>

              <ul className="flex flex-col gap-5">
                {AI_CAPABILITIES.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title} className="flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-lightprimary text-primary flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div>
                <Link href="/register" className={cn(buttonVariants({ variant: 'default' }), 'px-6')}>
                  <span>Experience Tenvi AI</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Column: Static Chat Preview Card Matching Redesigned Modal */}
            <div className="min-w-0 rounded-2xl bg-card shadow-lift overflow-hidden flex flex-col">
              {/* Minimalist Header */}
              <div className="px-4 py-3 bg-muted/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <TenviIcon variant="solid" className="w-8 h-8 rounded-lg shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground">Tenvi AI</span>
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-2xs font-semibold bg-success-soft text-success-soft-foreground">
                        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-success" />
                        Active
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">Financial assistant</span>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">Live context</span>
              </div>

              {/* Chat Body */}
              <div className="p-4 sm:p-5 flex flex-col gap-4">
                {/* User Prompt */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-tr-md text-sm font-medium">
                    Which credit card should I use for a ₱15,000 purchase today?
                  </div>
                </div>

                {/* AI Response Card */}
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-success-soft text-success-soft-foreground flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1 bg-muted/50 rounded-2xl rounded-tl-md p-4 flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        Recommended: BDO Titanium Mastercard
                      </span>
                      <span className="text-2xs font-semibold text-success-soft-foreground bg-success-soft px-2 py-0.5 rounded-full">
                        Optimal
                      </span>
                    </div>

                    {/* Compact Metrics */}
                    <dl className="grid grid-cols-3 gap-2">
                      <div className="min-w-0 p-2 rounded-xl bg-card text-center">
                        <dt className="text-2xs text-muted-foreground">Free float</dt>
                        <dd className="num text-sm font-bold text-success">52 days</dd>
                      </div>
                      <div className="min-w-0 p-2 rounded-xl bg-card text-center">
                        <dt className="text-2xs text-muted-foreground">Available</dt>
                        <dd className="num text-sm font-bold text-foreground">₱145k</dd>
                      </div>
                      <div className="min-w-0 p-2 rounded-xl bg-card text-center">
                        <dt className="text-2xs text-muted-foreground">Utilization</dt>
                        <dd className="num text-sm font-bold text-foreground">18%</dd>
                      </div>
                    </dl>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Your statement cut off yesterday. Swiping today grants 52 days of interest-free float until your due date.
                    </p>

                    <div className="px-3 py-2 rounded-xl bg-warning-soft text-xs leading-relaxed text-warning-soft-foreground">
                      <strong>Pro tip:</strong> Avoid Citi today—cutoff is in 36 hours.
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat Input Bar Preview (decorative — not an interactive field) */}
              <div aria-hidden="true" className="p-3 bg-muted/40">
                <div className="rounded-xl bg-background p-2 flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-muted-foreground pl-1">Ask a question or log spending…</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                      <ImagePlus className="w-4 h-4" />
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                      <Send className="w-4 h-4" />
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
        <section id="security" className="scroll-mt-16 py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-card p-6 sm:p-12 shadow-card text-center max-w-3xl mx-auto flex flex-col items-center gap-6">
            <div className="w-12 h-12 rounded-xl bg-success-soft text-success-soft-foreground flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>

            <div>
              <h2 className="text-[clamp(1.625rem,1.25rem+1.6vw,2.375rem)] font-bold leading-[1.12] tracking-[-0.025em] text-foreground">
                Privacy-first financial infrastructure
              </h2>
              <p className="mt-4 text-base text-muted-foreground leading-relaxed max-w-prose mx-auto">
                Your financial records belong exclusively to you. Built on top of enterprise PostgreSQL with strict Row Level Security (RLS), continuous TLS encryption in transit, and AES-256 encryption at rest.
              </p>
            </div>

            <ul className="flex flex-wrap justify-center gap-2">
              <li className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-4 py-2 text-sm font-medium text-foreground">
                <Lock className="w-4 h-4 text-muted-foreground" />
                Strict row-level isolation
              </li>
              <li className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-4 py-2 text-sm font-medium text-foreground">
                <EyeOff className="w-4 h-4 text-muted-foreground" />
                Zero third-party tracking
              </li>
              <li className="inline-flex items-center gap-2 rounded-full bg-muted/60 px-4 py-2 text-sm font-medium text-foreground">
                <DatabaseBackup className="w-4 h-4 text-muted-foreground" />
                Automated daily backups
              </li>
            </ul>
          </div>
        </section>

        {/* =========================================================================
            5. FINAL CALL TO ACTION
            ========================================================================= */}
        <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto flex flex-col items-center gap-5">
            <h2 className="text-[clamp(1.625rem,1.25rem+1.6vw,2.375rem)] font-bold leading-[1.12] tracking-[-0.025em] text-foreground">
              Ready to upgrade your financial infrastructure?
            </h2>
            <p className="max-w-prose text-base text-muted-foreground leading-relaxed">
              Join individuals, freelancers, and asset owners who have replaced scattered spreadsheets with automated clarity.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register" className={cn(buttonVariants({ variant: 'default' }), 'px-6')}>
                <span>Create free account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'px-6 text-foreground')}>
                Sign in to your vault
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Minimalist Footer — extra bottom room clears the floating voice widget */}
      <footer className="bg-muted/40 pt-10 pb-28 text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:justify-between lg:text-left">
            <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
              <TenviIcon variant="solid" className="w-6 h-6 rounded-lg" />
              <span className="font-semibold text-foreground">Tenvi Platform</span>
              <span aria-hidden="true">•</span>
              <span>All-in-one personal wealth infrastructure</span>
            </div>

            <nav aria-label="Footer" className="-mx-3 flex flex-wrap items-center justify-center gap-x-1 gap-y-1">
              <a href="#features" className={NAV_LINK}>
                Features
              </a>
              <a href="#solutions" className={NAV_LINK}>
                Solutions
              </a>
              <a href="#tenvi-ai" className={NAV_LINK}>
                Tenvi AI
              </a>
              <a href="#security" className={NAV_LINK}>
                Security
              </a>
              <Link href="/login" className={NAV_LINK}>
                Sign in
              </Link>
            </nav>
          </div>

          <p className="text-center text-xs lg:text-left">© {new Date().getFullYear()} Tenvi Labs. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
