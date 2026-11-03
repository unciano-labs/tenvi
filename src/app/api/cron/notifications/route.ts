import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { requireWebsiteAdmin } from '@/lib/auth/guards';
import { dispatchDailyNotifications } from '@/lib/notifications/dispatcher';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 0. Multi-path Fail-closed Authentication
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    let isAuthorized = false;

    // Path A: Bearer token matching CRON_SECRET (Vercel Cron & external schedulers)
    if (cronSecret && authHeader) {
      const expectedHeader = `Bearer ${cronSecret}`;
      const headerBuffer = Buffer.from(authHeader);
      const expectedBuffer = Buffer.from(expectedHeader);

      if (
        headerBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(headerBuffer, expectedBuffer)
      ) {
        isAuthorized = true;
      }
    }

    // Path B: Authenticated Website Admin session (manual triggers & testing)
    if (!isAuthorized) {
      try {
        const adminAuth = await requireWebsiteAdmin();
        if (adminAuth.isAuthorized) {
          isAuthorized = true;
        }
      } catch {
        // No request cookie store or unauthenticated
      }
    }

    // Path C: Local development fallback with explicit warning
    if (!isAuthorized && process.env.NODE_ENV === 'development') {
      console.warn('[Cron Notifications] Executing in development mode without Bearer credentials.');
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return NextResponse.json(
        {
          error: 'Unauthorized: Missing or invalid cron credentials',
          hint: 'Configure CRON_SECRET in Vercel / environment variables and pass Bearer <CRON_SECRET>, or sign in as a Tenvi administrator.',
        },
        { status: 401 }
      );
    }

    // 1. Execute consolidated daily notifications dispatcher
    const result = await dispatchDailyNotifications();

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to dispatch notifications' }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error running daily notifications cron:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
