import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
  reason?: 'ip_limit' | 'email_limit';
}

interface MemoryLimitEntry {
  count: number;
  expiresAt: number;
}

// In-memory sliding window cache for fast zero-latency pre-checks & resilient fallback
const memoryLimitStore = new Map<string, MemoryLimitEntry>();

// Prune expired in-memory entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryLimitStore.entries()) {
      if (entry.expiresAt <= now) {
        memoryLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

/**
 * Extracts and sanitizes the client IP address from request headers.
 * Supports Vercel, Cloudflare, standard reverse proxies, and local development.
 */
export async function getClientIp(): Promise<string> {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    if (forwardedFor) {
      const firstIp = forwardedFor.split(',')[0].trim();
      if (firstIp) return sanitizeIp(firstIp);
    }

    const realIp = headerList.get('x-real-ip');
    if (realIp) return sanitizeIp(realIp.trim());

    const cfConnectingIp = headerList.get('cf-connecting-ip');
    if (cfConnectingIp) return sanitizeIp(cfConnectingIp.trim());
  } catch {
    // In unit test or non-request contexts where headers() throws
  }

  return '127.0.0.1';
}

function sanitizeIp(ip: string): string {
  // Strip IPv6-mapped IPv4 prefix if present (e.g. "::ffff:192.168.1.1")
  let clean = ip.replace(/^::ffff:/i, '');
  // Strip port if present in IPv4 (e.g. "192.168.1.1:54321")
  if (clean.includes('.') && clean.includes(':')) {
    clean = clean.split(':')[0];
  }
  return clean || '127.0.0.1';
}

/**
 * Core sliding window rate limiter.
 * Evaluates in-memory cache first, then synchronizes with PostgreSQL bili_auth_rate_limits.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  // 1. In-memory check
  const memEntry = memoryLimitStore.get(key);
  if (memEntry && memEntry.expiresAt > now) {
    if (memEntry.count >= limit) {
      const resetInSeconds = Math.max(1, Math.ceil((memEntry.expiresAt - now) / 1000));
      return { allowed: false, remaining: 0, resetInSeconds };
    }
  }

  // 2. Database persistent check (shared across serverless worker instances)
  let dbCount = 0;
  let dbExpiresAt = now + windowMs;

  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      const { data: record, error } = await admin
        .from('bili_auth_rate_limits')
        .select('id, count, expires_at')
        .eq('key', key)
        .maybeSingle();

      if (!error && record) {
        const recordExpiry = new Date(record.expires_at).getTime();
        if (recordExpiry > now) {
          dbCount = record.count;
          dbExpiresAt = recordExpiry;

          if (dbCount >= limit) {
            const resetInSeconds = Math.max(1, Math.ceil((dbExpiresAt - now) / 1000));
            // Sync memory store
            memoryLimitStore.set(key, { count: dbCount, expiresAt: dbExpiresAt });
            return { allowed: false, remaining: 0, resetInSeconds };
          }

          // Increment count in DB
          dbCount += 1;
          await admin
            .from('bili_auth_rate_limits')
            .update({
              count: dbCount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id);
        } else {
          // Record expired; reset window
          dbCount = 1;
          dbExpiresAt = now + windowMs;
          await admin
            .from('bili_auth_rate_limits')
            .update({
              count: 1,
              expires_at: new Date(dbExpiresAt).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', record.id);
        }
      } else if (!error && !record) {
        // First entry
        dbCount = 1;
        await admin.from('bili_auth_rate_limits').insert({
          key,
          count: 1,
          expires_at: new Date(dbExpiresAt).toISOString(),
        });
      }
    }
  } catch (dbErr) {
    // If DB table is not yet created or connection times out, graceful fallback to memory
    console.warn('[RateLimit] Database check skipped or failed, using in-memory store:', dbErr);
  }

  // Update memory store with latest count
  const finalCount = Math.max(memEntry && memEntry.expiresAt > now ? memEntry.count + 1 : 1, dbCount || 1);
  const finalExpiry = memEntry && memEntry.expiresAt > now ? memEntry.expiresAt : dbExpiresAt;
  memoryLimitStore.set(key, { count: finalCount, expiresAt: finalExpiry });

  const remaining = Math.max(0, limit - finalCount);
  const resetInSeconds = Math.max(1, Math.ceil((finalExpiry - now) / 1000));

  return {
    allowed: finalCount <= limit,
    remaining,
    resetInSeconds,
  };
}

/**
 * Validates registration rate limits for an IP and email address.
 * Defaults:
 *   - By IP: 5 registration submissions per 15 minutes
 *   - By Email: 3 registration submissions per 15 minutes
 */
export async function checkRegistrationRateLimit(
  ip: string,
  email?: string
): Promise<RateLimitResult> {
  const WINDOW_SECONDS = 15 * 60; // 15 minutes
  const MAX_IP_ATTEMPTS = 5;
  const MAX_EMAIL_ATTEMPTS = 3;

  // 1. Check IP limit
  const ipKey = `ratelimit:register:ip:${ip}`;
  const ipCheck = await checkRateLimit(ipKey, MAX_IP_ATTEMPTS, WINDOW_SECONDS);
  if (!ipCheck.allowed) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: ipCheck.resetInSeconds,
      reason: 'ip_limit',
    };
  }

  // 2. Check Email limit if provided
  if (email && email.includes('@')) {
    const cleanEmail = email.trim().toLowerCase();
    const emailKey = `ratelimit:register:email:${cleanEmail}`;
    const emailCheck = await checkRateLimit(emailKey, MAX_EMAIL_ATTEMPTS, WINDOW_SECONDS);
    if (!emailCheck.allowed) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: emailCheck.resetInSeconds,
        reason: 'email_limit',
      };
    }
  }

  return {
    allowed: true,
    remaining: ipCheck.remaining,
    resetInSeconds: ipCheck.resetInSeconds,
  };
}

/**
 * Validates login rate limits for an IP and email address.
 * Defaults:
 *   - By IP: 10 login attempts per 15 minutes
 *   - By Email: 5 login attempts per 15 minutes
 */
export async function checkLoginRateLimit(
  ip: string,
  email?: string
): Promise<RateLimitResult> {
  const WINDOW_SECONDS = 15 * 60; // 15 minutes
  const MAX_IP_ATTEMPTS = 10;
  const MAX_EMAIL_ATTEMPTS = 5;

  const ipKey = `ratelimit:login:ip:${ip}`;
  const ipCheck = await checkRateLimit(ipKey, MAX_IP_ATTEMPTS, WINDOW_SECONDS);
  if (!ipCheck.allowed) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: ipCheck.resetInSeconds,
      reason: 'ip_limit',
    };
  }

  if (email && email.includes('@')) {
    const cleanEmail = email.trim().toLowerCase();
    const emailKey = `ratelimit:login:email:${cleanEmail}`;
    const emailCheck = await checkRateLimit(emailKey, MAX_EMAIL_ATTEMPTS, WINDOW_SECONDS);
    if (!emailCheck.allowed) {
      return {
        allowed: false,
        remaining: 0,
        resetInSeconds: emailCheck.resetInSeconds,
        reason: 'email_limit',
      };
    }
  }

  return {
    allowed: true,
    remaining: ipCheck.remaining,
    resetInSeconds: ipCheck.resetInSeconds,
  };
}

/**
 * Clears rate limit state for a key upon successful login or registration.
 */
export async function clearRateLimit(key: string): Promise<void> {
  memoryLimitStore.delete(key);
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      await admin.from('bili_auth_rate_limits').delete().eq('key', key);
    }
  } catch {}
}

