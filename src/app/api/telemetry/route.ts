import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      event_name,
      page_url,
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      is_pwa,
      event_data,
      user_id,
    } = body;

    if (!event_name || typeof event_name !== 'string') {
      return NextResponse.json({ error: 'Valid event_name is required' }, { status: 400 });
    }

    // Compute Privacy-Preserving Daily Salted Session Hash (GDPR / ePrivacy Safe)
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const today = new Date().toISOString().split('T')[0];
    const salt = process.env.ANALYTICS_SALT || 'tenvi-privacy-first-telemetry-salt-2026';

    const sessionHash = crypto
      .createHash('sha256')
      .update(`${clientIp}-${userAgent}-${today}-${salt}`)
      .digest('hex')
      .slice(0, 32);

    // Identify device type
    const isMobile = /mobile|iphone|android|ipad/i.test(userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';

    const admin = createAdminClient();
    await admin.from('bili_analytics_events').insert({
      website_id: WEBSITE_ID,
      event_name: event_name.slice(0, 80),
      session_hash: sessionHash,
      user_id: user_id || null,
      page_url: page_url ? String(page_url).slice(0, 500) : null,
      referrer: referrer ? String(referrer).slice(0, 500) : null,
      utm_source: utm_source ? String(utm_source).slice(0, 100) : null,
      utm_medium: utm_medium ? String(utm_medium).slice(0, 100) : null,
      utm_campaign: utm_campaign ? String(utm_campaign).slice(0, 100) : null,
      device_type: deviceType,
      is_pwa: Boolean(is_pwa),
      event_data: event_data || {},
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
