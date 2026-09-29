export interface SendSmsOptions {
  to: string;
  message: string;
  customApiKey?: string | null;
  customFrom?: string | null;
}

export interface SendSmsResult {
  success: boolean;
  status: 'sent' | 'simulated' | 'failed';
  messageId?: string;
  error?: string;
}

/**
 * Normalizes phone numbers to standard E.164 format (e.g. +639171234567 for Philippines)
 */
export function formatPhoneNumberE164(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9+]/g, '');
  if (!cleaned) return '';

  // Philippine numbers
  if (cleaned.startsWith('09') && cleaned.length === 11) {
    return `+63${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('9') && cleaned.length === 10) {
    return `+63${cleaned}`;
  }
  if (cleaned.startsWith('639') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('+639') && cleaned.length === 13) {
    return cleaned;
  }
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  return `+${cleaned}`;
}

/**
 * Resolve active httpSMS configuration.
 * Prioritizes user custom settings, then falls back to environment variables.
 */
export function getHttpSmsConfig(customApiKey?: string | null, customFrom?: string | null) {
  const apiKey =
    customApiKey?.trim() ||
    process.env.HTTPSMS_API_KEY ||
    process.env.HTTP_SMS_API_KEY ||
    '';

  const fromNumber = formatPhoneNumberE164(
    customFrom?.trim() ||
    process.env.HTTPSMS_FROM_NUMBER ||
    process.env.HTTP_SMS_FROM ||
    ''
  );

  const isConfigured = Boolean(apiKey && fromNumber);

  return {
    apiKey,
    fromNumber,
    isConfigured,
  };
}

/**
 * Verify httpSMS API credentials and gateway handshake
 */
export async function verifyHttpSmsConnection(
  apiKey: string,
  fromNumber?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return {
      success: false,
      error: 'Please enter your httpSMS API Key.',
    };
  }

  try {
    // 1. Verify API Key authenticity via /v1/users/me
    const res = await fetch('https://api.httpsms.com/v1/users/me', {
      method: 'GET',
      headers: {
        'x-api-key': cleanKey,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        error: 'Authentication failed. Invalid httpSMS API key. Please copy your key from httpsms.com/settings.',
      };
    }

    const userData = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        success: false,
        error: userData?.message || `httpSMS API returned HTTP status ${res.status}.`,
      };
    }

    const userEmail = userData?.data?.email || '';
    let extraNote = '';

    // 2. If sender phone number is provided, check Android phone heartbeat status
    if (fromNumber) {
      const cleanFrom = formatPhoneNumberE164(fromNumber);
      try {
        const hbRes = await fetch(
          `https://api.httpsms.com/v1/heartbeats?owner=${encodeURIComponent(cleanFrom)}`,
          {
            method: 'GET',
            headers: {
              'x-api-key': cleanKey,
              'Accept': 'application/json',
            },
            cache: 'no-store',
          }
        );

        if (hbRes.ok) {
          const hbData = await hbRes.json().catch(() => null);
          const heartbeats = hbData?.data || [];
          if (Array.isArray(heartbeats) && heartbeats.length > 0) {
            const lastHb = heartbeats[0];
            const lastSeen = new Date(lastHb.timestamp);
            const diffMs = Date.now() - lastSeen.getTime();
            const minsAgo = Math.max(0, Math.round(diffMs / 60000));

            if (minsAgo <= 15) {
              extraNote = ` Phone (${cleanFrom}) is ONLINE & active (heartbeat ${minsAgo}m ago).`;
            } else {
              extraNote = ` Phone (${cleanFrom}) last connected ${minsAgo}m ago. If test SMS stays queued, ensure the httpSMS Android app is open and battery optimization is disabled.`;
            }
          } else {
            extraNote = ` Sender SIM (${cleanFrom}) registered. No heartbeat recorded yet from device. Make sure the httpSMS app is running on your phone.`;
          }
        }
      } catch (hbErr) {
        console.warn('[httpSMS Service] Non-critical heartbeat check warning:', hbErr);
      }
    }

    return {
      success: true,
      message: `httpSMS Account connected (${userEmail || 'Authenticated'})!${extraNote}`,
    };
  } catch (err: any) {
    console.error('[httpSMS Service] Error verifying credentials:', err);
    return {
      success: false,
      error: err?.message || 'Could not connect to httpSMS API. Check network connection.',
    };
  }
}

/**
 * Sends an SMS notification using the httpSMS Gateway API
 * (https://api.httpsms.com/v1/messages/send)
 *
 * If credentials are not configured, operates gracefully in simulation mode.
 */
export async function sendHttpSms({
  to,
  message,
  customApiKey,
  customFrom,
}: SendSmsOptions): Promise<SendSmsResult> {
  const config = getHttpSmsConfig(customApiKey, customFrom);
  const normalizedTo = formatPhoneNumberE164(to);

  if (!normalizedTo) {
    return {
      success: false,
      status: 'failed',
      error: 'Invalid recipient phone number.',
    };
  }

  // Simulation mode if httpSMS credentials are not configured
  if (!config.isConfigured) {
    console.info(
      `[SMS Service] httpSMS credentials not configured. Simulated SMS to: ${normalizedTo} (Body: "${message.slice(0, 60)}...")`
    );

    const reason = !config.apiKey
      ? 'httpSMS API key not configured in settings or environment (Delivered in simulation mode).'
      : 'httpSMS sender mobile number not configured (Delivered in simulation mode).';

    return {
      success: true,
      status: 'simulated',
      messageId: `simulated-${Date.now()}`,
      error: reason,
    };
  }

  try {
    const payload = {
      content: message,
      from: config.fromNumber,
      to: normalizedTo,
    };

    const response = await fetch('https://api.httpsms.com/v1/messages/send', {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg =
        data?.message ||
        (response.status === 401
          ? 'Unauthorized: Invalid httpSMS API key'
          : `httpSMS dispatch failed with HTTP ${response.status}`);

      console.error(`[SMS Service] httpSMS error (${response.status}):`, data);

      return {
        success: false,
        status: 'failed',
        error: errorMsg,
      };
    }

    const messageId = data?.data?.id || `httpsms-${Date.now()}`;
    console.log(
      `[SMS Service] SMS dispatched via httpSMS to ${normalizedTo}. Message ID: ${messageId}`
    );

    return {
      success: true,
      status: 'sent',
      messageId,
    };
  } catch (error: any) {
    console.error(`[SMS Service] Exception dispatching SMS to ${normalizedTo}:`, error);

    return {
      success: false,
      status: 'failed',
      error: error?.message || 'Failed to dispatch SMS via httpSMS gateway.',
    };
  }
}
