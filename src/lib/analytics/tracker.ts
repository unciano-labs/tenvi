'use client';

export interface TelemetryPayload {
  event_name: string;
  event_data?: Record<string, any>;
  user_id?: string;
}

/**
 * Dispatches a first-party privacy-preserving telemetry event to /api/telemetry.
 * Uses navigator.sendBeacon where available for zero performance impact.
 */
export function trackClientEvent(
  eventName: string,
  eventData?: Record<string, any>,
  userId?: string
) {
  if (typeof window === 'undefined') return;

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const utmSource = searchParams.get('utm_source') || undefined;
    const utmMedium = searchParams.get('utm_medium') || undefined;
    const utmCampaign = searchParams.get('utm_campaign') || undefined;

    const isPwa =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    const payload = {
      event_name: eventName,
      page_url: window.location.pathname,
      referrer: document.referrer || undefined,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      is_pwa: isPwa,
      event_data: eventData || {},
      user_id: userId || undefined,
    };

    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/telemetry', blob);
    } else {
      fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch (err) {
    // Fail silently in client
  }
}
