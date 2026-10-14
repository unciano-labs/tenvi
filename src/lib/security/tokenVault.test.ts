import { describe, it, expect } from 'vitest';
import {
  encryptAccessToken,
  decryptAccessToken,
  maskAccessToken,
  assessConnectionHealth,
  type InstitutionConnectionRecord,
} from './tokenVault';

describe('Open Banking Token Vault (Task 4.3)', () => {
  it('encrypts and decrypts third-party banking tokens using AES-256-GCM', () => {
    const rawPlaidToken = 'access-production-7890abcdef1234567890123456';
    const encrypted = encryptAccessToken(rawPlaidToken);

    // Format should be iv:tag:ciphertext
    expect(encrypted).not.toBe(rawPlaidToken);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = decryptAccessToken(encrypted);
    expect(decrypted).toBe(rawPlaidToken);
  });

  it('fails safely when decrypting corrupted or tampered payloads', () => {
    const raw = 'secret-token';
    const encrypted = encryptAccessToken(raw);
    const parts = encrypted.split(':');

    // Corrupt ciphertext
    const tampered = `${parts[0]}:${parts[1]}:badc0de1234`;
    expect(() => decryptAccessToken(tampered)).toThrow();
  });

  it('masks access tokens cleanly for logs and UI previews', () => {
    expect(maskAccessToken('access-sandbox-998877665544332211')).toBe('access-s••••••••2211');
    expect(maskAccessToken('short')).toBe('••••••••');
    expect(maskAccessToken('')).toBe('');
  });

  it('evaluates institution connection health accurately', () => {
    const healthyConnection: InstitutionConnectionRecord = {
      id: 'conn-1',
      provider: 'brankas',
      institutionId: 'bpi',
      institutionName: 'Bank of the Philippine Islands',
      connectionStatus: 'connected',
      tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    };
    const health = assessConnectionHealth(healthyConnection);
    expect(health.isHealthy).toBe(true);
    expect(health.statusLabel).toBe('Active & Connected');

    const expiredConnection: InstitutionConnectionRecord = {
      ...healthyConnection,
      connectionStatus: 'expired',
    };
    const expiredHealth = assessConnectionHealth(expiredConnection);
    expect(expiredHealth.isHealthy).toBe(false);
    expect(expiredHealth.statusLabel).toBe('Token Expired');

    const errorConnection: InstitutionConnectionRecord = {
      ...healthyConnection,
      connectionStatus: 'error',
      syncError: 'User changed online banking password',
    };
    const errorHealth = assessConnectionHealth(errorConnection);
    expect(errorHealth.isHealthy).toBe(false);
    expect(errorHealth.statusLabel).toBe('Sync Error');
    expect(errorHealth.actionRequired).toContain('User changed online banking password');
  });
});
