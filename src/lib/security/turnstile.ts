/**
 * Cloudflare Turnstile CAPTCHA server-side verification.
 * Validates the turnstile response token against Cloudflare's siteverify API.
 */

export interface TurnstileVerifyResult {
  success: boolean;
  error?: string;
  errorCodes?: string[];
}

interface TurnstileApiResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

// Cloudflare public always-pass test secret key (used for development/testing if no custom secret configured)
const CLOUDFLARE_ALWAYS_PASS_SECRET = '1x0000000000000000000000000000000AA';

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string
): Promise<TurnstileVerifyResult> {
  const secretKey =
    process.env.TURNSTILE_SECRET_KEY ||
    (process.env.NODE_ENV !== 'production' ? CLOUDFLARE_ALWAYS_PASS_SECRET : '');

  // If Turnstile is completely unconfigured in production, log a warning and permit progression
  if (!secretKey) {
    console.warn(
      '[Turnstile] TURNSTILE_SECRET_KEY is not configured in environment. Skipping verification.'
    );
    return { success: true };
  }

  // If secret is configured, the token is mandatory
  if (!token || typeof token !== 'string' || !token.trim()) {
    return {
      success: false,
      error: 'Security verification required. Please complete the CAPTCHA to continue.',
      errorCodes: ['missing-input-response'],
    };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    if (remoteIp && remoteIp !== '127.0.0.1') {
      formData.append('remoteip', remoteIp);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 second timeout

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[Turnstile] Cloudflare API responded with status:', response.status);
      return {
        success: false,
        error: 'Security challenge service temporarily unavailable. Please retry in a moment.',
      };
    }

    const data: TurnstileApiResponse = await response.json();

    if (data.success) {
      return { success: true };
    }

    console.warn('[Turnstile] Verification failed:', data['error-codes']);
    return {
      success: false,
      error: 'Security verification failed. Please refresh or retry the verification box.',
      errorCodes: data['error-codes'],
    };
  } catch (err: any) {
    console.error('[Turnstile] Network error during token verification:', err);
    // In dev or timeout situations, don't permanently brick the user unless strictly in prod
    if (process.env.NODE_ENV !== 'production') {
      return { success: true };
    }
    return {
      success: false,
      error: 'Security verification timed out. Please check your connection and try again.',
    };
  }
}

