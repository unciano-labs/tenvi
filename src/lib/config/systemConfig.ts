import { unstable_cache, revalidateTag } from 'next/cache';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';

export interface SystemConfigMap {
  registration_gate: { mode: 'open' | 'invite_only' | 'closed' };
  maintenance_mode: { enabled: boolean; read_only: boolean; message: string };
  maintenance_banner: { enabled: boolean; message: string; severity: 'info' | 'warning' | 'alert' };
  ai_quotas: { daily_message_limit: number; model: string; allow_vision: boolean };
  feature_flags: { ocr_statements: boolean; open_banking: boolean; fx_auto_sync: boolean };
}

const DEFAULT_CONFIGS: SystemConfigMap = {
  registration_gate: { mode: 'open' },
  maintenance_mode: {
    enabled: false,
    read_only: false,
    message: 'Scheduled maintenance in progress. Please check back shortly.',
  },
  maintenance_banner: { enabled: false, message: '', severity: 'info' },
  ai_quotas: { daily_message_limit: 30, model: 'gemini-flash-latest', allow_vision: true },
  feature_flags: { ocr_statements: true, open_banking: false, fx_auto_sync: true },
};

/**
 * Retrieves a system configuration item cached with Next.js unstable_cache.
 * Purged instantly when revalidateTag('system-config') is invoked.
 */
export const getSystemConfig = unstable_cache(
  async <K extends keyof SystemConfigMap>(key: K): Promise<SystemConfigMap[K]> => {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('bili_system_config')
        .select('value')
        .eq('key', key)
        .eq('website_id', WEBSITE_ID)
        .maybeSingle();

      if (!error && data?.value) {
        return data.value as SystemConfigMap[K];
      }
    } catch (err) {
      console.warn(`[getSystemConfig] Cache miss/error for key: ${key}`, err);
    }

    return DEFAULT_CONFIGS[key];
  },
  ['system-config-lookup'],
  { tags: ['system-config'], revalidate: 3600 }
);

/**
 * Retrieves all configuration items for the admin panel.
 */
export async function getAllSystemConfigs(): Promise<SystemConfigMap> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('bili_system_config')
    .select('key, value')
    .eq('website_id', WEBSITE_ID);

  const configs = { ...DEFAULT_CONFIGS };
  (data || []).forEach((row) => {
    if (row.key in configs) {
      (configs as any)[row.key] = row.value;
    }
  });

  return configs;
}
