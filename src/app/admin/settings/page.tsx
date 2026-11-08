'use client';

import React, { useState, useEffect, useTransition, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  SlidersHorizontal,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
  Globe,
  Bell,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Lock,
  Coins,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  getAdminSystemSettingsAction,
  updateSystemSettingAction,
  triggerManualFxSyncAction,
  triggerManualNotificationsCronAction,
  CronHealthStatus,
} from '@/app/actions/admin/settings';
import { SystemConfigMap } from '@/lib/config/systemConfig';
import { NotificationGatewaysPanel } from '@/components/Admin/NotificationGatewaysPanel';
import { AdminCardTemplatesPanel } from '@/components/Admin/AdminCardTemplatesPanel';
import { NotificationLogsPanel } from '@/components/Admin/NotificationLogsPanel';
import { AiIntelligencePanel } from '@/components/Admin/AiIntelligencePanel';
import { toast } from 'sonner';

function AdminSettingsContent() {
  const searchParams = useSearchParams();
  const urlTab = searchParams.get('tab');
  const validTabs = ['system', 'gateways', 'templates', 'logs', 'ai'] as const;
  type TabType = (typeof validTabs)[number];

  const initialTab: TabType = validTabs.includes(urlTab as TabType)
    ? (urlTab as TabType)
    : 'system';

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [configs, setConfigs] = useState<SystemConfigMap | null>(null);
  const [cronStatus, setCronStatus] = useState<CronHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Sync tab if URL changes
  useEffect(() => {
    if (urlTab && validTabs.includes(urlTab as TabType)) {
      setActiveTab(urlTab as TabType);
    }
  }, [urlTab]);

  const loadData = () => {
    setLoading(true);
    getAdminSystemSettingsAction()
      .then((res) => {
        if (res.error) {
          toast.error(res.error);
        } else {
          setConfigs(res.configs);
          setCronStatus(res.cronStatus);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSetting = <K extends keyof SystemConfigMap>(key: K, value: SystemConfigMap[K]) => {
    startTransition(async () => {
      const res = await updateSystemSettingAction(key, value);
      if (res.success) {
        toast.success(`Configuration for "${key}" updated & cache purged`);
        setConfigs((prev) => (prev ? { ...prev, [key]: value } : prev));
      } else {
        toast.error(res.error || 'Failed to update setting');
      }
    });
  };

  const handleForceFxSync = () => {
    startTransition(async () => {
      const res = await triggerManualFxSyncAction();
      if (res.success) {
        toast.success(res.message || 'FX rates refreshed successfully');
        loadData();
      } else {
        toast.error(res.error || 'Failed to sync FX rates');
      }
    });
  };

  const handleRunNotificationsCron = () => {
    startTransition(async () => {
      const res = await triggerManualNotificationsCronAction();
      if (res.success) {
        toast.success(res.message || 'Notifications cron executed successfully');
        loadData();
      } else {
        toast.error(res.error || 'Failed to execute notifications cron');
      }
    });
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-display text-foreground">Developer settings & system config</h1>
            <span className="rounded-full bg-amber-500/12 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
              Live edge cache
            </span>
          </div>
          <p className="mt-1 max-w-prose text-sm sm:text-base text-muted-foreground">
            Operational switches, SMTP/SMS gateways, delivery logs, AI consumption telemetry, and background jobs.
          </p>
        </div>

        <div className="page-header-actions">
        {activeTab === 'system' && (
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading || isPending}
              aria-busy={isPending}
              className="gap-1.5"
            >
              <RotateCcw className={`size-4 ${isPending ? 'animate-spin' : ''}`} />
              Refresh status
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Control */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as TabType)}
        className="w-full gap-6"
      >
        <div className="-mx-1 max-w-[calc(100%+0.5rem)] overflow-x-auto no-scrollbar px-1">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-blue-500" />
            <span>System config</span>
          </TabsTrigger>

          <TabsTrigger value="gateways" className="flex items-center gap-2">
            <Server className="size-4 text-rose-500" />
            <span>Gateways & relay</span>
          </TabsTrigger>

          <TabsTrigger value="templates" className="flex items-center gap-2">
            <MessageSquare className="size-4 text-amber-500" />
            <span>Card due templates</span>
          </TabsTrigger>

          <TabsTrigger value="logs" className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span>Delivery logs</span>
          </TabsTrigger>

          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-500" />
            <span>AI & vision engine</span>
          </TabsTrigger>
        </TabsList>
        </div>

        {/* TAB 1: SYSTEM CONFIG */}
        <TabsContent value="system" className="space-y-6">
          {loading || !configs ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-2">
              <Loader2 className="size-6 animate-spin text-primary" />
              <p className="text-xs">Loading developer settings & cron status...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 @4xl/main:grid-cols-2 gap-6">
              {/* Module 1: Registration Gate */}
              <div className="min-w-0 p-5 sm:p-6 rounded-2xl bg-card shadow-card space-y-4">
                <div className="flex items-center justify-between gap-3 bg-muted/40 -mx-5 -mt-5 sm:-mx-6 sm:-mt-6 p-5 sm:p-6 rounded-t-2xl">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="shrink-0 p-2 rounded-xl bg-blue-500/10 text-blue-500">
                      <Globe className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Registration gate</h3>
                      <p className="text-xs text-muted-foreground">Control incoming signups</p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-0.5 text-xs font-semibold capitalize rounded-full bg-card text-foreground">
                    {configs.registration_gate.mode}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(['open', 'invite_only', 'closed'] as const).map((mode) => {
                    const active = configs.registration_gate.mode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => handleSaveSetting('registration_gate', { mode })}
                        className={`no-spring min-h-14 p-3 rounded-xl text-sm font-medium capitalize transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer flex flex-col items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          active
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'bg-muted/40 text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <span className="capitalize">{mode.replace('_', ' ')}</span>
                        <span className="text-xs font-normal opacity-70">
                          {mode === 'open' ? 'Public' : mode === 'invite_only' ? 'Invite' : 'Blocked'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Module 2: AI Quota & Budget Guard */}
              <div className="min-w-0 p-5 sm:p-6 rounded-2xl bg-card shadow-card space-y-4">
                <div className="flex items-center justify-between gap-3 bg-muted/40 -mx-5 -mt-5 sm:-mx-6 sm:-mt-6 p-5 sm:p-6 rounded-t-2xl">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="shrink-0 p-2 rounded-xl bg-purple-500/10 text-purple-500">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Tenvi AI quotas</h3>
                      <p className="text-xs text-muted-foreground">Gemini API consumption limiter</p>
                    </div>
                  </div>
                  <span className="num shrink-0 whitespace-nowrap px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400">
                    {configs.ai_quotas.daily_message_limit} msgs/day
                  </span>
                </div>

                <div className="grid-fluid gap-3 [--grid-min:9rem]">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label text-muted-foreground">Daily limit per member</label>
                    <Input
                      type="number"
                      min={5}
                      max={200}
                      value={configs.ai_quotas.daily_message_limit}
                      onChange={(e) =>
                        setConfigs({
                          ...configs,
                          ai_quotas: {
                            ...configs.ai_quotas,
                            daily_message_limit: Number(e.target.value),
                          },
                        })
                      }
                      onBlur={() => handleSaveSetting('ai_quotas', configs.ai_quotas)}
                      className="h-12 sm:h-10 bg-card"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-label text-muted-foreground">Vision OCR enabled</label>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...configs.ai_quotas,
                          allow_vision: !configs.ai_quotas.allow_vision,
                        };
                        handleSaveSetting('ai_quotas', updated);
                      }}
                      aria-pressed={configs.ai_quotas.allow_vision}
                      className={`no-spring w-full h-12 sm:h-10 rounded-lg text-sm font-semibold transition-colors duration-(--motion-fast) ease-(--ease-in-out) flex items-center justify-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        configs.ai_quotas.allow_vision
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                          : 'bg-muted/40 text-muted-foreground'
                      }`}
                    >
                      {configs.ai_quotas.allow_vision ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Module 3: Maintenance & Safety Modes */}
              <div className="min-w-0 p-5 sm:p-6 rounded-2xl bg-card shadow-card space-y-4">
                <div className="flex items-center justify-between gap-3 bg-muted/40 -mx-5 -mt-5 sm:-mx-6 sm:-mt-6 p-5 sm:p-6 rounded-t-2xl">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="shrink-0 p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <AlertTriangle className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Maintenance switches</h3>
                      <p className="text-xs text-muted-foreground">Read-only locks & dashboard alerts</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Maintenance Mode Toggle */}
                  <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-muted/50">
                    <div className="min-w-0 space-y-0.5">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                        Read-only database lock
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Temporarily blocks write mutations across transactions, loans, and cards.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...configs.maintenance_mode,
                          read_only: !configs.maintenance_mode.read_only,
                          enabled: !configs.maintenance_mode.read_only,
                        };
                        handleSaveSetting('maintenance_mode', updated);
                      }}
                      className={`no-spring shrink-0 h-10 px-3.5 rounded-lg text-sm font-semibold transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        configs.maintenance_mode.read_only
                          ? 'bg-destructive text-destructive-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {configs.maintenance_mode.read_only ? 'Locked' : 'Active'}
                    </button>
                  </div>

                  {/* Announcement Banner */}
                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/50">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <Bell className="size-3.5 shrink-0 text-muted-foreground" />
                        Global dashboard banner
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...configs.maintenance_banner,
                            enabled: !configs.maintenance_banner.enabled,
                          };
                          handleSaveSetting('maintenance_banner', updated);
                        }}
                        className={`no-spring shrink-0 h-10 px-3.5 rounded-lg text-sm font-semibold transition-colors duration-(--motion-fast) ease-(--ease-in-out) cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                          configs.maintenance_banner.enabled
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {configs.maintenance_banner.enabled ? 'Shown' : 'Hidden'}
                      </button>
                    </div>
                    <Input
                      value={configs.maintenance_banner.message}
                      onChange={(e) =>
                        setConfigs({
                          ...configs,
                          maintenance_banner: {
                            ...configs.maintenance_banner,
                            message: e.target.value,
                          },
                        })
                      }
                      onBlur={() => handleSaveSetting('maintenance_banner', configs.maintenance_banner)}
                      placeholder="e.g. Scheduled migration Sunday 2:00 AM UTC"
                      className="h-12 sm:h-10 bg-card"
                    />
                  </div>
                </div>
              </div>

              {/* Module 4: Background Crons & FX Engine Health */}
              <div className="min-w-0 p-5 sm:p-6 rounded-2xl bg-card shadow-card space-y-4">
                <div className="flex items-center justify-between gap-3 bg-muted/40 -mx-5 -mt-5 sm:-mx-6 sm:-mt-6 p-5 sm:p-6 rounded-t-2xl">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="shrink-0 p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                      <Zap className="size-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Background jobs & crons</h3>
                      <p className="text-xs text-muted-foreground">Automated reminders & currency exchange</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {/* FX Engine Card */}
                  <div className="p-4 rounded-xl bg-muted/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-[1_1_14rem] flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <Coins className="size-3.5 shrink-0 text-amber-500" />
                          FX exchange rates engine
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${cronStatus?.fxEngine.status === 'stale' ? 'bg-amber-500/12 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'}`}>
                          {cronStatus?.fxEngine.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Base: {cronStatus?.fxEngine.baseCurrency} • Pairs: {cronStatus?.fxEngine.ratesCount} • As of:{' '}
                        {cronStatus?.fxEngine.lastSyncDate || 'Never'}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleForceFxSync}
                      disabled={isPending}
                      aria-busy={isPending}
                      className="gap-1.5 bg-card"
                    >
                      <RefreshCw className={`size-4 ${isPending ? 'animate-spin' : ''}`} />
                      Force sync
                    </Button>
                  </div>

                  {/* Notifications Cron Card */}
                  <div className="p-4 rounded-xl bg-muted/50 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-[1_1_14rem] flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                          <Bell className="size-3.5 shrink-0 text-blue-500" />
                          Bill reminders cron
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 capitalize">
                          {cronStatus?.notifications.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Dispatched: {cronStatus?.notifications.totalDispatched} reminders • Last run:{' '}
                        {cronStatus?.notifications.lastRunAt
                          ? new Date(cronStatus.notifications.lastRunAt).toLocaleDateString()
                          : 'Scheduled'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground px-2 py-1 rounded bg-card hidden @xl/main:inline-block">
                        /api/cron/notifications
                      </span>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleRunNotificationsCron}
                        disabled={isPending}
                        aria-busy={isPending}
                        className="gap-1.5 bg-card"
                      >
                        <RefreshCw className={`size-4 ${isPending ? 'animate-spin' : ''}`} />
                        Run now
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: GATEWAYS & RELAY */}
        <TabsContent value="gateways">
          <NotificationGatewaysPanel />
        </TabsContent>

        {/* TAB 3: CARD DUE ALERT TEMPLATES */}
        <TabsContent value="templates">
          <AdminCardTemplatesPanel />
        </TabsContent>

        {/* TAB 4: DELIVERY LOGS */}
        <TabsContent value="logs">
          <NotificationLogsPanel />
        </TabsContent>

        {/* TAB 4: AI & VISION ENGINE */}
        <TabsContent value="ai">
          <AiIntelligencePanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-2">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-xs">Loading admin control plane...</p>
        </div>
      }
    >
      <AdminSettingsContent />
    </Suspense>
  );
}
