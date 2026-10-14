/**
 * Open Banking Token Vault & Financial Aggregator Security
 * Commercial FinTech standard for encrypting third-party banking tokens (Plaid, Brankas, Finverse)
 * at rest using AES-256-GCM authenticated encryption.
 */

import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128-bit initialization vector
const TAG_LENGTH = 16; // 128-bit authentication tag

function getVaultMasterKey(): Buffer {
  const secret =
    process.env.TOKEN_VAULT_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'tenvi-vault-default-secure-master-key-32b!';

  // Derive exact 256-bit (32 byte) key via SHA-256
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts an open banking access token using AES-256-GCM
 * Output format: hex(iv):hex(tag):hex(ciphertext)
 */
export function encryptAccessToken(plainToken: string): string {
  if (!plainToken) return '';

  const key = getVaultMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(plainToken, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted open banking token
 */
export function decryptAccessToken(encryptedString: string): string {
  if (!encryptedString) return '';

  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format. Expected iv:tag:ciphertext');
  }

  const [ivHex, tagHex, cipherHex] = parts;
  const key = getVaultMasterKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encryptedText = Buffer.from(cipherHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Masks an API token for secure display in the UI / logs
 * e.g., "access-sandbox-1234567890abcdef" -> "access-sand••••••••cdef"
 */
export function maskAccessToken(token: string): string {
  if (!token) return '';
  if (token.length <= 8) return '••••••••';
  const prefix = token.slice(0, 8);
  const suffix = token.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

export type OpenBankingProvider = 'brankas' | 'plaid' | 'finverse' | 'manual_import';

export interface InstitutionConnectionRecord {
  id: string;
  provider: OpenBankingProvider;
  institutionId: string;
  institutionName: string;
  connectionStatus: 'connected' | 'disconnected' | 'expired' | 'error';
  tokenExpiresAt?: string | null;
  lastSyncedAt?: string | null;
  syncError?: string | null;
}

/**
 * Validates connection health and returns human-readable status
 */
export function assessConnectionHealth(connection: InstitutionConnectionRecord): {
  isHealthy: boolean;
  statusLabel: string;
  badgeVariant: 'success' | 'warning' | 'destructive' | 'secondary';
  actionRequired?: string;
} {
  if (connection.connectionStatus === 'error') {
    return {
      isHealthy: false,
      statusLabel: 'Sync Error',
      badgeVariant: 'destructive',
      actionRequired: connection.syncError || 'Please reconnect your bank account credentials.',
    };
  }

  if (connection.connectionStatus === 'expired') {
    return {
      isHealthy: false,
      statusLabel: 'Token Expired',
      badgeVariant: 'warning',
      actionRequired: 'Bank session has expired. Re-authentication required.',
    };
  }

  if (connection.tokenExpiresAt) {
    const expiry = new Date(connection.tokenExpiresAt);
    const now = new Date();
    const daysRemaining = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (daysRemaining <= 0) {
      return {
        isHealthy: false,
        statusLabel: 'Session Expired',
        badgeVariant: 'warning',
        actionRequired: 'Bank consent expired. Please refresh connection.',
      };
    }
  }

  return {
    isHealthy: true,
    statusLabel: 'Active & Connected',
    badgeVariant: 'success',
  };
}
