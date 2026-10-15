'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  SlidersHorizontal,
  ShieldAlert,
  Sparkles,
  Zap,
  Globe,
  Bell,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Loader2,
  Lock,
  Unlock,
  Coins,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getAdminSystemSettingsAction,
  updateSystemSettingAction,
  triggerManualFxSyncAction,
  CronHealthStatus,
} from '@/app/actions/admin/settings';
import { SystemConfigMap } from '@/lib/config/systemConfig';
import { toast } from 'sonner';

export default function AdminSettingsPage() {
  const [configs, setConfigs] = useState<SystemConfigMap | null>(null);
  const [cronStatus, setCronStatus] = useState<CronHealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

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

  if (loading || !configs) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground space-y-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p className="text-xs">Loading developer settings & cron status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Developer Settings & System Config
            </h1>
            <span className="px-2 py-0.5 text-2xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md">
              Live Edge Cache
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational switches, AI consumption quotas, maintenance controls, and background job health.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={loading || isPending}
          className="gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className={`size-3.5 ${isPending ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module 1: Registration Gate */}
        <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Globe className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Registration Gate</h3>
                <p className="text-3xs text-muted-foreground">Control incoming signups</p>
              </div>
            </div>
            <span className="px-2 py-0.5 text-3xs font-extrabold uppercase rounded bg-muted text-foreground">
              {configs.registration_gate.mode}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(['open', 'invite_only', 'closed'] as const).map((mode) => {
              const active = configs.registration_gate.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() =>
                    handleSaveSetting('registration_gate', { mode })
                  }
                  className={`p-3 rounded-xl border text-xs font-semibold capitalize transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    active
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-2xs'
                      : 'border-border/60 bg-muted/30 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="capitalize">{mode.replace('_', ' ')}</span>
                  <span className="text-3xs font-normal opacity-70">
                    {mode === 'open' ? 'Public' : mode === 'invite_only' ? 'Invite' : 'Blocked'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Module 2: AI Quota & Budget Guard */}
        <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500">
                <Sparkles className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Tenvi AI Quotas</h3>
                <p className="text-3xs text-muted-foreground">Gemini API consumption limiter</p>
              </div>
            </div>
            <span className="px-2 py-0.5 text-3xs font-extrabold rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
              {configs.ai_quotas.daily_message_limit} msgs/day
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-2xs font-semibold text-muted-foreground">Daily Limit Per Member</label>
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
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <label className="text-2xs font-semibold text-muted-foreground">Vision OCR Enabled</label>
              <button
                type="button"
                onClick={() => {
                  const updated = {
                    ...configs.ai_quotas,
                    allow_vision: !configs.ai_quotas.allow_vision,
                  };
                  handleSaveSetting('ai_quotas', updated);
                }}
                className={`w-full h-9 rounded-lg border text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  configs.ai_quotas.allow_vision
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-border/60 bg-muted/40 text-muted-foreground'
                }`}
              >
                {configs.ai_quotas.allow_vision ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
        </div>

        {/* Module 3: Maintenance & Safety Modes */}
        <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <AlertTriangle className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Maintenance Switches</h3>
                <p className="text-3xs text-muted-foreground">Read-only locks & dashboard alerts</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* Maintenance Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/40">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Lock className="size-3 text-muted-foreground" />
                  Read-Only Database Lock
                </span>
                <p className="text-3xs text-muted-foreground">
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  configs.maintenance_mode.read_only
                    ? 'bg-destructive text-destructive-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {configs.maintenance_mode.read_only ? 'LOCKED' : 'ACTIVE'}
              </button>
            </div>

            {/* Announcement Banner */}
            <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Bell className="size-3 text-muted-foreground" />
                  Global Dashboard Banner
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
                  className={`px-2.5 py-1 rounded-md text-3xs font-bold cursor-pointer ${
                    configs.maintenance_banner.enabled
                      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {configs.maintenance_banner.enabled ? 'SHOWN' : 'HIDDEN'}
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
                className="text-xs h-8 bg-card"
              />
            </div>
          </div>
        </div>

        {/* Module 4: Background Crons & FX Engine Health */}
        <div className="p-6 rounded-2xl bg-card border border-border/60 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Zap className="size-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Background Jobs & Crons</h3>
                <p className="text-3xs text-muted-foreground">Automated reminders & currency exchange</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {/* FX Engine Card */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Coins className="size-3 text-amber-500" />
                    FX Exchange Rates Engine
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-3xs font-extrabold bg-emerald-500/10 text-emerald-600 uppercase">
                    {cronStatus?.fxEngine.status}
                  </span>
                </div>
                <p className="text-3xs text-muted-foreground">
                  Base: {cronStatus?.fxEngine.baseCurrency} • Pairs: {cronStatus?.fxEngine.ratesCount} • As of:{' '}
                  {cronStatus?.fxEngine.lastSyncDate || 'Never'}
                </p>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={handleForceFxSync}
                disabled={isPending}
                className="h-8 text-2xs gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`size-3 ${isPending ? 'animate-spin' : ''}`} />
                Force Sync
              </Button>
            </div>

            {/* Notifications Cron Card */}
            <div className="p-3 rounded-xl bg-muted/30 border border-border/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Bell className="size-3 text-blue-500" />
                    Bill Reminders Cron
                  </span>
                  <span className="px-1.5 py-0.2 rounded text-3xs font-extrabold bg-blue-500/10 text-blue-600 uppercase">
                    {cronStatus?.notifications.status}
                  </span>
                </div>
                <p className="text-3xs text-muted-foreground">
                  Dispatched: {cronStatus?.notifications.totalDispatched} reminders • Last run:{' '}
                  {cronStatus?.notifications.lastRunAt
                    ? new Date(cronStatus.notifications.lastRunAt).toLocaleDateString()
                    : 'Scheduled'}
                </p>
              </div>

              <span className="text-3xs font-mono text-muted-foreground px-2 py-1 rounded bg-muted">
                /api/cron/notifications
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
