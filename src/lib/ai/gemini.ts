import { GoogleGenAI } from '@google/genai';
import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { GeminiUsageStats } from '@/types';

// The verified active models for Google Gen AI Free Tier
export const GEMINI_PRIMARY_MODEL = 'gemini-3.5-flash-lite';
export const GEMINI_FALLBACK_MODEL = 'gemini-flash-lite-latest';
export const GEMINI_CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash',
];
export const GEMINI_DAILY_LIMIT = 1500;
export const GEMINI_RPM_LIMIT = 15;

/**
 * Returns configured API key or empty string
 */
export function getGeminiApiKey(customKey?: string): string {
  return (
    customKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    ''
  );
}

/**
 * Masks an API key for safe UI display (e.g. "AQ.Ab8...itxIw")
 */
export function maskApiKey(key: string): string {
  if (!key) return 'Not Configured';
  if (key.length <= 10) return '••••••••';
  return `${key.slice(0, 8)}••••${key.slice(-4)}`;
}

/**
 * Logs a Gemini API invocation in Supabase for consumption tracking
 */
export async function recordGeminiUsage({
  userId,
  feature,
  model = GEMINI_PRIMARY_MODEL,
  inputTokens = 0,
  outputTokens = 0,
  status = 'success',
  errorMessage = null,
  latencyMs = 0,
}: {
  userId: string;
  feature: 'statement_vision' | 'ai_chat' | 'test_connection';
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  status?: 'success' | 'rate_limit' | 'error';
  errorMessage?: string | null;
  latencyMs?: number;
}) {
  try {
    const supabase = await createClient();
    await supabase.from('bili_ai_usage').insert({
      website_id: WEBSITE_ID,
      user_id: userId,
      feature,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      status,
      error_message: errorMessage,
      latency_ms: latencyMs,
    });
  } catch (err) {
    console.error('Failed to log Gemini usage:', err);
  }
}

/**
 * Fetches real-time Gemini consumption and quota stats for the current user
 */
export async function getGeminiUsageStats(userId: string): Promise<GeminiUsageStats> {
  const apiKey = getGeminiApiKey();
  const hasKeyConfigured = Boolean(apiKey);
  const maskedKey = maskApiKey(apiKey);

  const supabase = await createClient();

  // Start of today in UTC
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();

  // Next reset is midnight UTC
  const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const resetHoursRemaining = Math.max(0, Math.round((endOfToday.getTime() - now.getTime()) / (1000 * 60 * 60)));

  // Query usage records for today
  const { data: todayLogs } = await supabase
    .from('bili_ai_usage')
    .select('feature, total_tokens, created_at')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', userId)
    .gte('created_at', startOfToday)
    .order('created_at', { ascending: false });

  const dailyRequestsUsed = todayLogs?.length || 0;
  const dailyRemainingRequests = Math.max(0, GEMINI_DAILY_LIMIT - dailyRequestsUsed);
  const dailyPercentUsed = Math.min(100, Math.round((dailyRequestsUsed / GEMINI_DAILY_LIMIT) * 100));

  let tokensUsedToday = 0;
  let statementVisionCount = 0;
  let aiChatCount = 0;
  let otherCount = 0;

  if (todayLogs) {
    todayLogs.forEach((log) => {
      tokensUsedToday += Number(log.total_tokens || 0);
      if (log.feature === 'statement_vision') statementVisionCount++;
      else if (log.feature === 'ai_chat') aiChatCount++;
      else otherCount++;
    });
  }

  const lastRequestAt = todayLogs && todayLogs.length > 0 ? todayLogs[0].created_at : null;

  return {
    hasKeyConfigured,
    maskedKey,
    dailyRequestsUsed,
    dailyRequestsLimit: GEMINI_DAILY_LIMIT,
    dailyPercentUsed,
    dailyRemainingRequests,
    minuteRateLimit: GEMINI_RPM_LIMIT,
    tokensUsedToday,
    usageByFeature: {
      statementVision: statementVisionCount,
      aiChat: aiChatCount,
      other: otherCount,
    },
    lastRequestAt,
    resetHoursRemaining,
  };
}

/**
 * Tests connection to Google Gemini API and measures round-trip latency
 */
export async function testGeminiConnection(customKey?: string): Promise<{
  success: boolean;
  latencyMs: number;
  model: string;
  error?: string;
}> {
  const apiKey = getGeminiApiKey(customKey);
  if (!apiKey) {
    return {
      success: false,
      latencyMs: 0,
      model: GEMINI_PRIMARY_MODEL,
      error: 'No Gemini API key found in .env.local or provided.',
    };
  }

  const startTime = Date.now();
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_PRIMARY_MODEL,
      contents: 'Respond with the word PONG only.',
    });

    const latencyMs = Date.now() - startTime;
    const text = response.text?.trim() || '';

    if (text) {
      return {
        success: true,
        latencyMs,
        model: GEMINI_PRIMARY_MODEL,
      };
    }

    return {
      success: false,
      latencyMs,
      model: GEMINI_PRIMARY_MODEL,
      error: 'Empty response received from Gemini.',
    };
  } catch (primaryErr: any) {
    // Try fallback model
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: GEMINI_FALLBACK_MODEL,
        contents: 'Respond with PONG only.',
      });
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        latencyMs,
        model: GEMINI_FALLBACK_MODEL,
      };
    } catch (fallbackErr: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        latencyMs,
        model: GEMINI_PRIMARY_MODEL,
        error: primaryErr.message || fallbackErr.message || 'Gemini connection test failed.',
      };
    }
  }
}
