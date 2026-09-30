import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { checkUserWebsiteMembership } from '@/lib/auth/guards';
import { enrollUserInTenvi, seedInitialUserData } from '@/app/actions/auth';

/**
 * Handles the OAuth callback from Google (and any future OAuth providers).
 *
 * Flow:
 * 1. Exchanges the OAuth authorization code for a Supabase session.
 * 2. Checks if the authenticated user has an active role in Tenvi (WEBSITE_ID).
 * 3. If not yet enrolled: Auto-enrolls the user into Tenvi (creates user_profile,
 *    assigns default role, and seeds initial wallet/categories).
 * 4. Redirects the user to /dashboard (or requested 'next' URL).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  if (error) {
    console.error('[OAuth Callback] Provider error:', error, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError || !data?.user) {
      console.error('[OAuth Callback] exchangeCodeForSession failed:', exchangeError);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(
          exchangeError?.message || 'Authentication failed. Please try again.'
        )}`
      );
    }

    const user = data.user;
    const email = user.email || '';
    const fullName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      email.split('@')[0] ||
      '';

    try {
      // Check if user is already enrolled for Tenvi (WEBSITE_ID)
      const isEnrolled = await checkUserWebsiteMembership(user.id, WEBSITE_ID);

      if (!isEnrolled) {
        // Fresh or Cross-Site User:
        // Google OAuth guarantees verified email ownership. Automatically enroll in Tenvi:
        await enrollUserInTenvi(user.id, email, fullName);
        await seedInitialUserData(user.id);
      }
    } catch (enrollErr) {
      console.error('[OAuth Callback] Auto-enrollment error for Google user:', enrollErr);
    }

    // Forward to destination (guarantee safe relative path)
    const forwardUrl = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
    return NextResponse.redirect(`${origin}${forwardUrl}`);
  }

  // No code parameter provided
  return NextResponse.redirect(`${origin}/login?error=no_auth_code`);
}
