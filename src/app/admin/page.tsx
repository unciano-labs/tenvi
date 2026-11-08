import React from 'react';
import Link from 'next/link';
import {
  Users,
  MessageSquare,
  SlidersHorizontal,
  BarChart3,
  ShieldAlert,
  ArrowRight,
  Database,
  Activity,
  Sparkles,
  Zap,
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AdminOverviewPage() {
  let memberCount = 0;
  let activeLogCount = 0;

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      const [{ count: members }, { count: logs }] = await Promise.all([
        admin
          .from('user_roles')
          .select('id, website_roles!inner(website_id)', { count: 'exact', head: true })
          .eq('website_roles.website_id', WEBSITE_ID),
        admin
          .from('bili_audit_logs')
          .select('id', { count: 'exact', head: true })
          .eq('website_id', WEBSITE_ID),
      ]);

      memberCount = members || 0;
      activeLogCount = logs || 0;
    }
  } catch (err) {
    console.warn('[AdminOverviewPage] Failed to fetch quick metrics:', err);
  }

  const ADMIN_MODULES = [
    {
      title: 'Members directory',
      description:
        'Search all registered Tenvi accounts, review operational activity counts, and toggle suspensions without exposing private financial numbers.',
      href: '/admin/members',
      icon: Users,
      badge: `${memberCount} registered`,
      color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
    },
    {
      title: 'Direct feedback inbox',
      description:
        'Review member bug reports, feature requests, and accounting questions with auto-attached viewport, PWA status, and private dev notes.',
      href: '/admin/feedback',
      icon: MessageSquare,
      badge: 'Triage center',
      color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    {
      title: 'Developer settings & switches',
      description:
        'Control registration gates, trigger maintenance banners or read-only modes, configure Gemini AI daily quotas, and monitor background crons.',
      href: '/admin/settings',
      icon: SlidersHorizontal,
      badge: 'System config',
      color: 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
    },
    {
      title: 'Analytics & acquisition funnel',
      description:
        'First-party, privacy-preserving telemetry tracking landing visitors, conversion rates, and member feature usage with daily salted hashing.',
      href: '/admin/analytics',
      icon: BarChart3,
      badge: 'Zero 3rd-party scripts',
      color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
    },
  ];

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div className="page-header">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <ShieldAlert className="size-3.5" />
              Administrative control plane
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success-soft-foreground">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Operational
            </span>
          </div>
          <h1 className="text-display text-foreground">System overview & management</h1>
          <p className="max-w-prose text-sm sm:text-base text-muted-foreground">
            Centralized operator cockpit for member access controls, developer switches, direct feedback, and privacy-first product telemetry.
          </p>
        </div>

        <div className="page-header-actions">
          <Link
            href="/dashboard"
            className="inline-flex h-12 sm:h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors duration-(--motion-fast) ease-(--ease-in-out) outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Open personal vault
          </Link>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid-fluid gap-3 sm:gap-4 [--grid-min:9.5rem]">
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <span className="text-label text-muted-foreground">Registered members</span>
            <Users className="size-4 shrink-0 text-blue-700 dark:text-blue-400" />
          </div>
          <div className="num text-figure text-foreground">{memberCount}</div>
          <p className="text-xs text-muted-foreground">Active in Tenvi website</p>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <span className="text-label text-muted-foreground">Audit log events</span>
            <Activity className="size-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div className="num text-figure text-foreground">{activeLogCount}</div>
          <p className="text-xs text-muted-foreground">Immutable financial events</p>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <span className="text-label text-muted-foreground">Telemetry engine</span>
            <Zap className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="text-figure text-foreground">First-party</div>
          <p className="text-xs text-muted-foreground">Salted daily IP hashing</p>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-card p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <span className="text-label text-muted-foreground">Privacy protocol</span>
            <Database className="size-4 shrink-0 text-violet-700 dark:text-violet-400" />
          </div>
          <div className="text-figure text-foreground">Zero-leak</div>
          <p className="text-xs text-muted-foreground">No member balances exposed</p>
        </div>
      </div>

      {/* Admin Modules */}
      <section className="flex flex-col gap-4">
        <h2 className="text-title text-foreground">Management modules</h2>
        <div className="grid grid-cols-1 @3xl/main:grid-cols-2 gap-4">
          {ADMIN_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.href}
                href={module.href}
                className="group motion-surface flex min-w-0 flex-col gap-4 rounded-2xl bg-card p-5 sm:p-6 shadow-card hover:shadow-lift outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`flex size-10 items-center justify-center rounded-xl ${module.color}`}>
                    <Icon className="size-5" />
                  </div>
                  <span className="truncate rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    {module.badge}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="flex items-center gap-1.5 text-title text-foreground group-hover:text-primary transition-colors duration-(--motion-fast) ease-(--ease-in-out)">
                    {module.title}
                    <ArrowRight className="size-4 shrink-0 text-primary opacity-0 -translate-x-1 transition-[opacity,transform] duration-(--motion-fast) ease-(--ease-in-out) group-hover:opacity-100 group-hover:translate-x-0" />
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{module.description}</p>
                </div>
                <div className="mt-auto flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2 text-xs">
                  <span className="font-medium text-foreground">Configure & manage</span>
                  <span className="truncate font-mono text-muted-foreground">{module.href}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
