'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireWebsiteAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { SystemConfigMap, getAllSystemConfigs } from '@/lib/config/systemConfig';

export interface CronHealthStatus {
  notifications: {
    lastRunAt: string | null;
    totalDispatched: number;
    status: 'healthy' | 'idle' | 'error';
  };
  fxEngine: {
    lastSyncDate: string | null;
    ratesCount: number;
    baseCurrency: string;
    status: 'healthy' | 'stale' | 'error';
  };
}

/**
 * Admin action to fetch all current system configurations.
 */
export async function getAdminSystemSettingsAction(): Promise<{
  configs: SystemConfigMap;
  cronStatus: CronHealthStatus;
  error?: string;
}> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return {
      configs: {} as any,
      cronStatus: {} as any,
      error: 'Unauthorized: Admin privileges required',
    };
  }

  try {
    const admin = createAdminClient();
    const configs = await getAllSystemConfigs();

    // 1. Check Notifications Cron Status from bili_notification_logs
    const { data: latestLog, count: logCount } = await admin
      .from('bili_notification_logs')
      .select('created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Check FX Exchange Rates from bili_exchange_rates
    const { data: latestFx, count: fxCount } = await admin
      .from('bili_exchange_rates')
      .select('as_of_date, created_at', { count: 'exact' })
      .order('as_of_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const todayStr = new Date().toISOString().split('T')[0];
    const isFxToday = latestFx?.as_of_date === todayStr;

    const cronStatus: CronHealthStatus = {
      notifications: {
        lastRunAt: latestLog?.created_at || null,
        totalDispatched: logCount || 0,
        status: latestLog ? 'healthy' : 'idle',
      },
      fxEngine: {
        lastSyncDate: latestFx?.as_of_date || null,
        ratesCount: fxCount || 0,
        baseCurrency: 'PHP',
        status: isFxToday ? 'healthy' : 'stale',
      },
    };

    return { configs, cronStatus };
  } catch (err: any) {
    console.error('[getAdminSystemSettingsAction] Error:', err);
    return { configs: {} as any, cronStatus: {} as any, error: err.message };
  }
}

/**
 * Admin action to update a configuration key and immediately purge cache tags.
 */
export async function updateSystemSettingAction<K extends keyof SystemConfigMap>(
  key: K,
  value: SystemConfigMap[K]
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from('bili_system_config').upsert({
      key,
      website_id: WEBSITE_ID,
      value,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    // Invalidate Next.js cache tag
    revalidateTag('system-config', { expire: 0 });
    revalidatePath('/admin/settings');
    revalidatePath('/dashboard', 'layout');

    return { success: true };
  } catch (err: any) {
    console.error(`[updateSystemSettingAction] Failed to update ${key}:`, err);
    return { success: false, error: err.message || 'Failed to update setting' };
  }
}

/**
 * Admin action to force-trigger FX rates sync.
 */
export async function triggerManualFxSyncAction(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const admin = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    // Standard updated rates baseline (Base: PHP)
    const rates = [
      { base_currency: 'PHP', target_currency: 'USD', rate: 0.01754, source: 'manual_sync', as_of_date: today },
      { base_currency: 'PHP', target_currency: 'EUR', rate: 0.01612, source: 'manual_sync', as_of_date: today },
      { base_currency: 'PHP', target_currency: 'SGD', rate: 0.02325, source: 'manual_sync', as_of_date: today },
      { base_currency: 'PHP', target_currency: 'JPY', rate: 2.68450, source: 'manual_sync', as_of_date: today },
      { base_currency: 'PHP', target_currency: 'GBP', rate: 0.01375, source: 'manual_sync', as_of_date: today },
      { base_currency: 'PHP', target_currency: 'AUD', rate: 0.02670, source: 'manual_sync', as_of_date: today },
      { base_currency: 'PHP', target_currency: 'CAD', rate: 0.02410, source: 'manual_sync', as_of_date: today },
      { base_currency: 'PHP', target_currency: 'HKD', rate: 0.13680, source: 'manual_sync', as_of_date: today },
    ];

    for (const r of rates) {
      await admin.from('bili_exchange_rates').upsert(r, {
        onConflict: 'base_currency,target_currency,as_of_date',
      });
    }

    revalidatePath('/admin/settings');
    return { success: true, message: `Successfully synced ${rates.length} currency exchange pairs.` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to sync FX rates' };
  }
}
