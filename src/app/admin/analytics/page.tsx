'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  MousePointerClick,
  UserCheck,
  Smartphone,
  Monitor,
  RotateCcw,
  Loader2,
  Wallet,
  CreditCard,
  Building2,
  HandCoins,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  getAdminAnalyticsAction,
  LandingAnalyticsData,
  MemberUsageAnalyticsData,
} from '@/app/actions/admin/analytics';
import { toast } from 'sonner';

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'landing' | 'usage'>('landing');
  const [landing, setLanding] = useState<LandingAnalyticsData | null>(null);
  const [usage, setUsage] = useState<MemberUsageAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = () => {
    setLoading(true);
    getAdminAnalyticsAction()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else {
          setLanding(res.landing);
          setUsage(res.usage);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading || !landing || !usage) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-xs">Aggregating telemetry & product metrics...</p>
      </div>
    );
  }

  // Feature total for relative percentages
  const totalFeatureEvents =
    usage.featureUsage.transactions +
    usage.featureUsage.creditCards +
    usage.featureUsage.loans +
    usage.featureUsage.properties +
    usage.featureUsage.aiChat || 1;

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-display text-foreground">Analytics & telemetry</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
              <ShieldCheck className="size-3.5" /> First-party
            </span>
          </div>
          <p className="mt-1 max-w-prose text-sm sm:text-base text-muted-foreground">
            Privacy-preserving conversion funnels and product engagement without 3rd-party tracking scripts.
          </p>
        </div>

        <div className="page-header-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
            aria-busy={loading}
            className="gap-1.5"
          >
            <RotateCcw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <div role="tablist" aria-label="Analytics views" className="flex max-w-full items-center gap-1 self-start overflow-x-auto no-scrollbar rounded-xl bg-muted p-1">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'landing'}
          onClick={() => setActiveTab('landing')}
          className={`no-spring shrink-0 inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm cursor-pointer outline-none transition-colors duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring ${
            activeTab === 'landing'
              ? 'bg-card text-foreground font-semibold shadow-card'
              : 'font-medium text-muted-foreground hover:text-foreground'
          }`}
        >
          <TrendingUp className="size-4" />
          Acquisition & landing funnel
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'usage'}
          onClick={() => setActiveTab('usage')}
          className={`no-spring shrink-0 inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-sm cursor-pointer outline-none transition-colors duration-(--motion-fast) ease-(--ease-in-out) focus-visible:ring-2 focus-visible:ring-ring ${
            activeTab === 'usage'
              ? 'bg-card text-foreground font-semibold shadow-card'
              : 'font-medium text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="size-4" />
          Member retention & feature usage
        </button>
      </div>

      {activeTab === 'landing' ? (
        /* Tab 1: Acquisition & Landing Funnel */
        <div className="flex flex-col gap-6">
          {/* Top KPI Cards */}
          <div className="grid-fluid gap-3 sm:gap-4 [--grid-min:10rem]">
            <div className="p-5 rounded-2xl bg-card shadow-card space-y-1 min-w-0">
              <div className="flex items-start justify-between gap-2 text-muted-foreground">
                <span className="min-w-0 text-label">Unique visitors</span>
                <Eye className="size-4 text-blue-500" />
              </div>
              <div className="num text-figure text-foreground">{landing.uniqueVisitors}</div>
              <p className="text-xs text-muted-foreground">Salted daily IP hashes</p>
            </div>

            <div className="p-5 rounded-2xl bg-card shadow-card space-y-1 min-w-0">
              <div className="flex items-start justify-between gap-2 text-muted-foreground">
                <span className="min-w-0 text-label">Page views</span>
                <TrendingUp className="size-4 text-emerald-500" />
              </div>
              <div className="num text-figure text-foreground">{landing.totalPageViews}</div>
              <p className="text-xs text-muted-foreground">Across all landing pages</p>
            </div>

            <div className="p-5 rounded-2xl bg-card shadow-card space-y-1 min-w-0">
              <div className="flex items-start justify-between gap-2 text-muted-foreground">
                <span className="min-w-0 text-label">CTA click-throughs</span>
                <MousePointerClick className="size-4 text-amber-500" />
              </div>
              <div className="num text-figure text-foreground">{landing.ctaClicks}</div>
              <p className="text-xs text-muted-foreground">Get Started interactions</p>
            </div>

            <div className="p-5 rounded-2xl bg-card shadow-card space-y-1 min-w-0">
              <div className="flex items-start justify-between gap-2 text-muted-foreground">
                <span className="min-w-0 text-label">Conversion rate</span>
                <UserCheck className="size-4 text-violet-500" />
              </div>
              <div className="num text-figure text-foreground">{landing.conversionRate}%</div>
              <p className="text-xs text-muted-foreground">Visitor to registered member</p>
            </div>
          </div>

          {/* Acquisition Funnel Visualizer */}
          <div className="p-6 rounded-2xl bg-card shadow-card space-y-4">
            <h3 className="text-title text-foreground">Acquisition funnel progression</h3>
            <div className="grid-fluid gap-3 [--grid-min:12rem]">
              <div className="p-4 rounded-xl bg-muted/40 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground">1. Landing page visit</span>
                  <span className="num text-xs text-muted-foreground">100%</span>
                </div>
                <div className="num text-xl font-bold text-foreground">{landing.uniqueVisitors}</div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-full rounded-full" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground">2. CTA clicked</span>
                  <span className="num text-xs text-muted-foreground">
                    {Math.round((landing.ctaClicks / Math.max(landing.uniqueVisitors, 1)) * 100)}%
                  </span>
                </div>
                <div className="num text-xl font-bold text-foreground">{landing.ctaClicks}</div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        Math.round((landing.ctaClicks / Math.max(landing.uniqueVisitors, 1)) * 100),
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground">3. Member enrolled</span>
                  <span className="num text-xs text-muted-foreground">{landing.conversionRate}%</span>
                </div>
                <div className="num text-xl font-bold text-foreground">{landing.registeredMembers}</div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(landing.conversionRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Traffic Sources & Device Breakdown */}
          <div className="grid grid-cols-1 @4xl/main:grid-cols-3 gap-6">
            <div className="@4xl/main:col-span-2 min-w-0 p-6 rounded-2xl bg-card shadow-card space-y-4">
              <h3 className="text-title text-foreground">Top referral & campaign sources</h3>
              <div className="flex flex-col gap-1 text-sm">
                {landing.topReferrers.map((r, i) => (
                  <div key={r.source} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 even:bg-muted/40">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="truncate font-semibold text-foreground capitalize">{r.source}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="num text-xs text-muted-foreground">{r.count} visits</span>
                      <span className="text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                        {Math.round((r.count / Math.max(landing.totalPageViews, 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card shadow-card space-y-4">
              <h3 className="text-title text-foreground">Device & PWA distribution</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-muted/30 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Monitor className="size-4 text-blue-500" /> Desktop
                  </span>
                  <span className="num text-sm font-semibold">{landing.deviceBreakdown.desktop}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Smartphone className="size-4 text-purple-500" /> Mobile browser
                  </span>
                  <span className="num text-sm font-semibold">{landing.deviceBreakdown.mobile}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Zap className="size-4 text-amber-500" /> Standalone PWA
                  </span>
                  <span className="num text-sm font-semibold text-primary">{landing.deviceBreakdown.pwa}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Member Retention & Feature Usage */
        <div className="flex flex-col gap-6">
          {/* Active Members Grid */}
          <div className="grid-fluid gap-3 sm:gap-4 [--grid-min:10rem]">
            <div className="p-5 rounded-2xl bg-card shadow-card space-y-1 min-w-0">
              <div className="flex items-start justify-between gap-2 text-muted-foreground">
                <span className="min-w-0 text-label">Daily active (DAU)</span>
                <Users className="size-4 text-blue-500" />
              </div>
              <div className="num text-figure text-foreground">{usage.dau}</div>
              <p className="text-xs text-muted-foreground">Unique members active today</p>
            </div>

            <div className="p-5 rounded-2xl bg-card shadow-card space-y-1 min-w-0">
              <div className="flex items-start justify-between gap-2 text-muted-foreground">
                <span className="min-w-0 text-label">Weekly active (WAU)</span>
                <TrendingUp className="size-4 text-purple-500" />
              </div>
              <div className="num text-figure text-foreground">{usage.wau}</div>
              <p className="text-xs text-muted-foreground">Active in past 7 days</p>
            </div>

            <div className="p-5 rounded-2xl bg-card shadow-card space-y-1 min-w-0">
              <div className="flex items-start justify-between gap-2 text-muted-foreground">
                <span className="min-w-0 text-label">Monthly active (MAU)</span>
                <UserCheck className="size-4 text-emerald-500" />
              </div>
              <div className="num text-figure text-foreground">{usage.mau}</div>
              <p className="text-xs text-muted-foreground">Active in past 30 days</p>
            </div>

            <div className="p-5 rounded-2xl bg-card shadow-card space-y-1 min-w-0">
              <div className="flex items-start justify-between gap-2 text-muted-foreground">
                <span className="min-w-0 text-label">Stickiness (DAU/MAU)</span>
                <Zap className="size-4 text-amber-500" />
              </div>
              <div className="num text-figure text-foreground">{usage.stickinessRatio}%</div>
              <p className="text-xs text-muted-foreground">Daily product habituation</p>
            </div>
          </div>

          {/* Feature Breakdown Progress Bars */}
          <div className="p-6 rounded-2xl bg-card shadow-card space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-title text-foreground">Feature adoption & ledger volume</h3>
                <p className="text-xs text-muted-foreground">
                  Distribution of record creations across core financial verticals.
                </p>
              </div>
              <span className="num text-sm font-semibold text-primary">
                {totalFeatureEvents} total operations
              </span>
            </div>

            <div className="space-y-4">
              {/* Transactions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <Wallet className="size-3.5 text-blue-500" /> Transactions & spending
                  </span>
                  <span className="num text-xs font-semibold">
                    {usage.featureUsage.transactions} (
                    {Math.round((usage.featureUsage.transactions / totalFeatureEvents) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${(usage.featureUsage.transactions / totalFeatureEvents) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Credit Cards */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="size-3.5 text-purple-500" /> Credit cards & statements
                  </span>
                  <span className="num text-xs font-semibold">
                    {usage.featureUsage.creditCards} (
                    {Math.round((usage.featureUsage.creditCards / totalFeatureEvents) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{
                      width: `${(usage.featureUsage.creditCards / totalFeatureEvents) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Loans */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <HandCoins className="size-3.5 text-emerald-500" /> Loans & receivables
                  </span>
                  <span className="num text-xs font-semibold">
                    {usage.featureUsage.loans} (
                    {Math.round((usage.featureUsage.loans / totalFeatureEvents) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${(usage.featureUsage.loans / totalFeatureEvents) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Properties */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="size-3.5 text-amber-500" /> Properties & assets
                  </span>
                  <span className="num text-xs font-semibold">
                    {usage.featureUsage.properties} (
                    {Math.round((usage.featureUsage.properties / totalFeatureEvents) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${(usage.featureUsage.properties / totalFeatureEvents) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* AI Assistant */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="size-3.5 text-violet-500" /> Tenvi AI natural language chat
                  </span>
                  <span className="num text-xs font-semibold">
                    {usage.featureUsage.aiChat} (
                    {Math.round((usage.featureUsage.aiChat / totalFeatureEvents) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full"
                    style={{
                      width: `${(usage.featureUsage.aiChat / totalFeatureEvents) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
