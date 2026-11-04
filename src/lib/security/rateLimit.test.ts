import { describe, it, expect, beforeEach } from 'vitest';
import {
  checkRateLimit,
  checkRegistrationRateLimit,
  checkLoginRateLimit,
  clearRateLimit,
} from './rateLimit';

describe('Security: rateLimit Engine', () => {
  const testIp = '192.168.1.100';
  const testEmail = 'user.test@example.com';

  beforeEach(async () => {
    // Clear test keys before each run
    await clearRateLimit(`ratelimit:register:ip:${testIp}`);
    await clearRateLimit(`ratelimit:register:email:${testEmail}`);
    await clearRateLimit(`ratelimit:login:ip:${testIp}`);
    await clearRateLimit(`ratelimit:login:email:${testEmail}`);
    await clearRateLimit('ratelimit:custom:test');
  });

  describe('checkRateLimit generic sliding window', () => {
    it('allows requests within limit and decrements remaining', async () => {
      const res1 = await checkRateLimit('ratelimit:custom:test', 3, 60);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(2);

      const res2 = await checkRateLimit('ratelimit:custom:test', 3, 60);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(1);

      const res3 = await checkRateLimit('ratelimit:custom:test', 3, 60);
      expect(res3.allowed).toBe(true);
      expect(res3.remaining).toBe(0);

      const res4 = await checkRateLimit('ratelimit:custom:test', 3, 60);
      expect(res4.allowed).toBe(false);
      expect(res4.remaining).toBe(0);
      expect(res4.resetInSeconds).toBeGreaterThan(0);
    });

    it('clears rate limit state with clearRateLimit', async () => {
      await checkRateLimit('ratelimit:custom:test', 1, 60);
      const blocked = await checkRateLimit('ratelimit:custom:test', 1, 60);
      expect(blocked.allowed).toBe(false);

      await clearRateLimit('ratelimit:custom:test');
      const unblocked = await checkRateLimit('ratelimit:custom:test', 1, 60);
      expect(unblocked.allowed).toBe(true);
    });
  });

  describe('checkRegistrationRateLimit', () => {
    it('allows valid registration attempts up to the threshold', async () => {
      const res = await checkRegistrationRateLimit(testIp, testEmail);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBeGreaterThan(0);
    });

    it('blocks after 3 attempts on the same email within 15 minutes', async () => {
      // Limit is 3 for email
      await checkRegistrationRateLimit('10.0.0.1', testEmail); // 1
      await checkRegistrationRateLimit('10.0.0.2', testEmail); // 2
      await checkRegistrationRateLimit('10.0.0.3', testEmail); // 3

      const blocked = await checkRegistrationRateLimit('10.0.0.4', testEmail);
      expect(blocked.allowed).toBe(false);
      expect(blocked.reason).toBe('email_limit');
      expect(blocked.resetInSeconds).toBeGreaterThan(0);
    });

    it('blocks after 5 attempts from the same IP within 15 minutes', async () => {
      // Limit is 5 for IP
      for (let i = 1; i <= 5; i++) {
        await checkRegistrationRateLimit(testIp, `unique_${i}@example.com`);
      }

      const blocked = await checkRegistrationRateLimit(testIp, 'unique_6@example.com');
      expect(blocked.allowed).toBe(false);
      expect(blocked.reason).toBe('ip_limit');
    });
  });

  describe('checkLoginRateLimit', () => {
    it('allows valid login attempts up to the threshold', async () => {
      const res = await checkLoginRateLimit(testIp, testEmail);
      expect(res.allowed).toBe(true);
    });

    it('blocks after 5 login attempts on the same email', async () => {
      for (let i = 1; i <= 5; i++) {
        await checkLoginRateLimit(`10.0.0.${i}`, testEmail);
      }

      const blocked = await checkLoginRateLimit('10.0.0.6', testEmail);
      expect(blocked.allowed).toBe(false);
      expect(blocked.reason).toBe('email_limit');
    });
  });
});

