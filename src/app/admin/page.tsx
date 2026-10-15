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
      title: 'Members Directory',
      description:
        'Search all registered Tenvi accounts, review operational activity counts, and toggle suspensions without exposing private financial numbers.',
      href: '/admin/members',
      icon: Users,
      badge: `${memberCount} Registered`,
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    },
    {
      title: 'Direct Feedback Inbox',
      description:
        'Review member bug reports, feature requests, and accounting questions with auto-attached viewport, PWA status, and private dev notes.',
      href: '/admin/feedback',
      icon: MessageSquare,
      badge: 'Triage Center',
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    {
      title: 'Developer Settings & Switches',
      description:
        'Control registration gates, trigger maintenance banners or read-only modes, configure Gemini AI daily quotas, and monitor background crons.',
      href: '/admin/settings',
      icon: SlidersHorizontal,
      badge: 'System Config',
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    },
    {
      title: 'Analytics & Acquisition Funnel',
      description:
        'First-party, privacy-preserving telemetry tracking landing visitors, conversion rates, and member feature usage with daily salted hashing.',
      href: '/admin/analytics',
      icon: BarChart3,
      badge: 'Zero 3rd-Party Scripts',
      color: 'from-violet-500/10 to-purple-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-br from-card via-card to-amber-500/5 border border-border/70 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-2xs font-extrabold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-md tracking-wider flex items-center gap-1">
              <ShieldAlert className="size-3" />
              Administrative Control Plane
            </span>
            <span className="inline-flex items-center gap-1 text-2xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Operational
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            System Overview & Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Centralized operator cockpit for member access controls, developer switches, direct feedback, and privacy-first product telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            Open Personal Vault
          </Link>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-2xs font-semibold uppercase tracking-wider">Registered Members</span>
            <Users className="size-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{memberCount}</div>
          <p className="text-3xs text-muted-foreground">Active in Tenvi website</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-2xs font-semibold uppercase tracking-wider">Audit Log Events</span>
            <Activity className="size-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-foreground">{activeLogCount}</div>
          <p className="text-3xs text-muted-foreground">Immutable financial events</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-2xs font-semibold uppercase tracking-wider">Telemetry Engine</span>
            <Zap className="size-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-foreground">First-Party</div>
          <p className="text-3xs text-muted-foreground">Salted daily IP hashing</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/60 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-2xs font-semibold uppercase tracking-wider">Privacy Protocol</span>
            <Database className="size-4 text-violet-500" />
          </div>
          <div className="text-2xl font-black text-foreground">Zero-Leak</div>
          <p className="text-3xs text-muted-foreground">No member balances exposed</p>
        </div>
      </div>

      {/* Admin Modules Grid */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-foreground tracking-tight">Management Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ADMIN_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.href}
                href={module.href}
                className="group relative p-5 rounded-2xl bg-card border border-border/60 hover:border-border hover:shadow-lift transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl border bg-gradient-to-br ${module.color}`}>
                      <Icon className="size-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-3xs font-bold bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {module.badge}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                      {module.title}
                      <ArrowRight className="size-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-border/40 flex items-center justify-between text-2xs text-muted-foreground">
                  <span className="font-semibold text-foreground/80">Configure & Manage</span>
                  <span className="font-mono text-3xs text-muted-foreground/80">{module.href}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
