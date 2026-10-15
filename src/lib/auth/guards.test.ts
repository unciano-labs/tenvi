import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isUserAdmin, ADMIN_EMAIL } from '@/lib/constants';

describe('Admin Role & Guard Logic', () => {
  it('correctly identifies superadmin email', () => {
    expect(isUserAdmin('webcareer1@gmail.com')).toBe(true);
    expect(isUserAdmin('WEBCREER1@GMAIL.COM')).toBe(false); // typo
    expect(isUserAdmin('webcareer1+admin@gmail.com')).toBe(true);
  });

  it('rejects regular member emails', () => {
    expect(isUserAdmin('user@example.com')).toBe(false);
    expect(isUserAdmin('sampleone@gmail.com')).toBe(false);
    expect(isUserAdmin('')).toBe(false);
    expect(isUserAdmin(null)).toBe(false);
    expect(isUserAdmin(undefined)).toBe(false);
  });

  it('normalizes whitespace and casing for admin email', () => {
    expect(isUserAdmin('  webcareer1@gmail.com  ')).toBe(true);
    expect(isUserAdmin('  WebCareer1@Gmail.Com  ')).toBe(true);
  });
});
