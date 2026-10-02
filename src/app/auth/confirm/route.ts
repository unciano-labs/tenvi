import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { checkUserWebsiteMembership } from '@/lib/auth/guards';
import { enrollUserInTenvi, seedInitialUserData } from '@/app/actions/auth';

/**
 * Handles Supabase email confirmations, magic links, OTP verifications,
 * and recovery links.
 *
 * Supported params:
 * - `token_hash` & `type` (email, signup, invite, magiclink, recovery, etc.)
 * - `code` (standard PKCE exchange code)
 * - `error` & `error_description` (handles expired or invalid OTP links gracefully)
 * - `next` (safe relative redirect destination)
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const searchParams = requestUrl.searchParams;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Robust origin resolution (handles Vercel reverse proxy and custom domains)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const isLocal = requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1';

  const origin = forwardedHost && !isLocal
    ? `${forwardedProto}://${forwardedHost}`
    : requestUrl.origin;

  // 1. Handle error redirects (e.g. otp_expired, access_denied)
  if (error) {
    console.warn('[Auth Confirm] Verification error received from provider:', error, errorDescription);
    const message = errorDescription || (error === 'access_denied' ? 'Email verification link is invalid or has expired.' : error);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();

  // Helper to ensure multi-tenant enrollment in Tenvi
  const ensureEnrolled = async (userId: string, email: string, metadataFullName?: string) => {
    try {
      const isEnrolled = await checkUserWebsiteMembership(userId, WEBSITE_ID);
      if (!isEnrolled) {
        const fullName = metadataFullName || email.split('@')[0] || '';
        await enrollUserInTenvi(userId, email, fullName);
        await seedInitialUserData(userId);
      }
    } catch (enrollErr) {
      console.error('[Auth Confirm] Auto-enrollment error:', enrollErr);
    }
  };

  // Helper for safe destination redirect
  const getSafeRedirectUrl = () => {
    const forwardUrl = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
    return `${origin}${forwardUrl}`;
  };

  // 2. Token hash verification (standard Supabase email OTP)
  if (token_hash && type) {
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (verifyError || !data?.user) {
      console.error('[Auth Confirm] verifyOtp failed:', verifyError);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          verifyError?.message || 'Verification link is invalid or has expired.'
        )}`
      );
    }

    const user = data.user;
    const email = user.email || '';
    const fullName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      '';

    await ensureEnrolled(user.id, email, fullName);
    return NextResponse.redirect(getSafeRedirectUrl());
  }

  // 3. Authorization code exchange (PKCE)
  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data?.user) {
      console.error('[Auth Confirm] exchangeCodeForSession failed:', exchangeError);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          exchangeError?.message || 'Verification failed. Please try again.'
        )}`
      );
    }

    const user = data.user;
    const email = user.email || '';
    const fullName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      '';

    await ensureEnrolled(user.id, email, fullName);
    return NextResponse.redirect(getSafeRedirectUrl());
  }

  // 4. Missing required query parameters
  return NextResponse.redirect(`${origin}/login?error=invalid_verification_link`);
}
