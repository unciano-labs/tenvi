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
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Analytics & Telemetry
            </h1>
            <span className="px-2 py-0.5 text-2xs font-extrabold bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-md flex items-center gap-1">
              <ShieldCheck className="size-3" /> First-Party
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Privacy-preserving conversion funnels and product engagement without 3rd-party tracking scripts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
            className="gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RotateCcw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('landing')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'landing'
              ? 'bg-foreground text-background shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <TrendingUp className="size-3.5" />
          Acquisition & Landing Funnel
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('usage')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'usage'
              ? 'bg-foreground text-background shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <BarChart3 className="size-3.5" />
          Member Retention & Feature Usage
        </button>
      </div>

      {activeTab === 'landing' ? (
        /* Tab 1: Acquisition & Landing Funnel */
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-2xs font-semibold uppercase tracking-wider">Unique Visitors</span>
                <Eye className="size-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-foreground">{landing.uniqueVisitors}</div>
              <p className="text-3xs text-muted-foreground">Salted daily IP hashes</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-2xs font-semibold uppercase tracking-wider">Page Views</span>
                <TrendingUp className="size-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-foreground">{landing.totalPageViews}</div>
              <p className="text-3xs text-muted-foreground">Across all landing pages</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-2xs font-semibold uppercase tracking-wider">CTA Click-Throughs</span>
                <MousePointerClick className="size-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-foreground">{landing.ctaClicks}</div>
              <p className="text-3xs text-muted-foreground">Get Started interactions</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-2xs font-semibold uppercase tracking-wider">Conversion Rate</span>
                <UserCheck className="size-4 text-violet-500" />
              </div>
              <div className="text-2xl font-black text-foreground">{landing.conversionRate}%</div>
              <p className="text-3xs text-muted-foreground">Visitor to registered member</p>
            </div>
          </div>

          {/* Acquisition Funnel Visualizer */}
          <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground">Acquisition Funnel Progression</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">1. Landing Page Visit</span>
                  <span className="font-mono text-2xs text-muted-foreground">100%</span>
                </div>
                <div className="text-xl font-extrabold text-foreground">{landing.uniqueVisitors}</div>
                <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 w-full rounded-full" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">2. CTA Clicked</span>
                  <span className="font-mono text-2xs text-muted-foreground">
                    {Math.round((landing.ctaClicks / Math.max(landing.uniqueVisitors, 1)) * 100)}%
                  </span>
                </div>
                <div className="text-xl font-extrabold text-foreground">{landing.ctaClicks}</div>
                <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
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

              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">3. Member Enrolled</span>
                  <span className="font-mono text-2xs text-muted-foreground">{landing.conversionRate}%</span>
                </div>
                <div className="text-xl font-extrabold text-foreground">{landing.registeredMembers}</div>
                <div className="h-1.5 w-full bg-border/60 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(landing.conversionRate, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Traffic Sources & Device Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground">Top Referral & Campaign Sources</h3>
              <div className="divide-y divide-border/40 text-xs">
                {landing.topReferrers.map((r, i) => (
                  <div key={r.source} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-3xs text-muted-foreground w-4">{i + 1}.</span>
                      <span className="font-semibold text-foreground capitalize">{r.source}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-2xs text-muted-foreground">{r.count} visits</span>
                      <span className="text-3xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                        {Math.round((r.count / Math.max(landing.totalPageViews, 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground">Device & PWA Distribution</h3>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Monitor className="size-4 text-blue-500" /> Desktop
                  </span>
                  <span className="font-mono text-xs font-bold">{landing.deviceBreakdown.desktop}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Smartphone className="size-4 text-purple-500" /> Mobile Browser
                  </span>
                  <span className="font-mono text-xs font-bold">{landing.deviceBreakdown.mobile}</span>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <Zap className="size-4 text-amber-500" /> Standalone PWA
                  </span>
                  <span className="font-mono text-xs font-bold text-primary">{landing.deviceBreakdown.pwa}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Member Retention & Feature Usage */
        <div className="space-y-6">
          {/* Active Members Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-2xs font-semibold uppercase tracking-wider">Daily Active (DAU)</span>
                <Users className="size-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-foreground">{usage.dau}</div>
              <p className="text-3xs text-muted-foreground">Unique members active today</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-2xs font-semibold uppercase tracking-wider">Weekly Active (WAU)</span>
                <TrendingUp className="size-4 text-purple-500" />
              </div>
              <div className="text-2xl font-black text-foreground">{usage.wau}</div>
              <p className="text-3xs text-muted-foreground">Active in past 7 days</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-2xs font-semibold uppercase tracking-wider">Monthly Active (MAU)</span>
                <UserCheck className="size-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-foreground">{usage.mau}</div>
              <p className="text-3xs text-muted-foreground">Active in past 30 days</p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-2xs font-semibold uppercase tracking-wider">Stickiness (DAU/MAU)</span>
                <Zap className="size-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-foreground">{usage.stickinessRatio}%</div>
              <p className="text-3xs text-muted-foreground">Daily product habituation</p>
            </div>
          </div>

          {/* Feature Breakdown Progress Bars */}
          <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Feature Adoption & Ledger Volume</h3>
                <p className="text-3xs text-muted-foreground">
                  Distribution of record creations across core financial verticals.
                </p>
              </div>
              <span className="text-2xs font-bold text-primary font-mono">
                {totalFeatureEvents} Total Operations
              </span>
            </div>

            <div className="space-y-4">
              {/* Transactions */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <Wallet className="size-3.5 text-blue-500" /> Transactions & Spending
                  </span>
                  <span className="font-mono text-2xs font-bold">
                    {usage.featureUsage.transactions} (
                    {Math.round((usage.featureUsage.transactions / totalFeatureEvents) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{
                      width: `${(usage.featureUsage.transactions / totalFeatureEvents) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Credit Cards */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="size-3.5 text-purple-500" /> Credit Cards & Statements
                  </span>
                  <span className="font-mono text-2xs font-bold">
                    {usage.featureUsage.creditCards} (
                    {Math.round((usage.featureUsage.creditCards / totalFeatureEvents) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{
                      width: `${(usage.featureUsage.creditCards / totalFeatureEvents) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Loans */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <HandCoins className="size-3.5 text-emerald-500" /> Loans & Receivables
                  </span>
                  <span className="font-mono text-2xs font-bold">
                    {usage.featureUsage.loans} (
                    {Math.round((usage.featureUsage.loans / totalFeatureEvents) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{
                      width: `${(usage.featureUsage.loans / totalFeatureEvents) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Properties */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="size-3.5 text-amber-500" /> Properties & Assets
                  </span>
                  <span className="font-mono text-2xs font-bold">
                    {usage.featureUsage.properties} (
                    {Math.round((usage.featureUsage.properties / totalFeatureEvents) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{
                      width: `${(usage.featureUsage.properties / totalFeatureEvents) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* AI Assistant */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="size-3.5 text-violet-500" /> Tenvi AI Natural Language Chat
                  </span>
                  <span className="font-mono text-2xs font-bold">
                    {usage.featureUsage.aiChat} (
                    {Math.round((usage.featureUsage.aiChat / totalFeatureEvents) * 100)}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
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
