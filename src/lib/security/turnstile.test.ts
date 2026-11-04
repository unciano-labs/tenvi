import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyTurnstileToken } from './turnstile';

describe('Security: Cloudflare Turnstile Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects empty or whitespace-only token when secret is configured', async () => {
    const res = await verifyTurnstileToken('', '127.0.0.1');
    expect(res.success).toBe(false);
    expect(res.error).toContain('CAPTCHA');
    expect(res.errorCodes).toContain('missing-input-response');
  });

  it('rejects null or undefined token', async () => {
    const res = await verifyTurnstileToken(null, '127.0.0.1');
    expect(res.success).toBe(false);
  });

  it('verifies successfully when Cloudflare siteverify responds with success', async () => {
    // Mock global fetch for Cloudflare siteverify
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        challenge_ts: new Date().toISOString(),
        hostname: 'tenvi.vercel.app',
      }),
    } as any);

    const res = await verifyTurnstileToken('mock_valid_turnstile_token', '1.2.3.4');
    expect(res.success).toBe(true);
    expect(res.error).toBeUndefined();
  });

  it('returns failure when Cloudflare siteverify responds with invalid token', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        'error-codes': ['invalid-input-response'],
      }),
    } as any);

    const res = await verifyTurnstileToken('mock_invalid_token', '1.2.3.4');
    expect(res.success).toBe(false);
    expect(res.error).toContain('Security verification failed');
    expect(res.errorCodes).toContain('invalid-input-response');
  });

  it('allows test_pass_token in non-production environments', async () => {
    const prevNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const res = await verifyTurnstileToken('test_pass_token', '127.0.0.1');
      expect(res.success).toBe(true);
      expect(res.error).toBeUndefined();
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
    }
  });
});

