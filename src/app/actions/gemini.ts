'use server';

import { createClient } from '@/lib/supabase/server';
import {
  getGeminiUsageStats,
  testGeminiConnection,
  recordGeminiUsage,
  GEMINI_PRIMARY_MODEL,
} from '@/lib/ai/gemini';
import { GeminiUsageStats } from '@/types';

/**
 * Server Action to fetch live Gemini API usage and quota stats
 */
export async function getGeminiUsageStatsAction(): Promise<{
  stats: GeminiUsageStats | null;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { stats: null, error: 'Unauthorized' };
    }

    const stats = await getGeminiUsageStats(user.id);
    return { stats };
  } catch (err: any) {
    console.error('Error fetching Gemini usage stats:', err);
    return { stats: null, error: err.message || 'Failed to load usage stats' };
  }
}

/**
 * Server Action to test the configured or custom Gemini API key
 */
export async function testGeminiConnectionAction(customKey?: string): Promise<{
  success: boolean;
  latencyMs: number;
  model: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const res = await testGeminiConnection(customKey);

    if (user) {
      await recordGeminiUsage({
        userId: user.id,
        feature: 'test_connection',
        model: res.model,
        status: res.success ? 'success' : 'error',
        errorMessage: res.error,
        latencyMs: res.latencyMs,
      });
    }

    return res;
  } catch (err: any) {
    return {
      success: false,
      latencyMs: 0,
      model: GEMINI_PRIMARY_MODEL,
      error: err.message || 'Unexpected connection error',
    };
  }
}
