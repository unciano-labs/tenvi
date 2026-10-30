import { describe, it, expect } from 'vitest';
import { isWidgetAllowed, ALLOWED_WIDGETS } from './widgets';

describe('Widget Allowlist Security', () => {
  it('allows the registered voice agent widget on the landing page', () => {
    expect(isWidgetAllowed('VOICE_AGENT', '/')).toBe(true);
  });

  it('rejects unknown widget IDs', () => {
    // @ts-expect-error Testing invalid widget ID
    expect(isWidgetAllowed('MALICIOUS_WIDGET', '/')).toBe(false);
  });

  it('strictly blocks widgets on protected dashboard routes', () => {
    expect(isWidgetAllowed('VOICE_AGENT', '/dashboard')).toBe(false);
    expect(isWidgetAllowed('VOICE_AGENT', '/dashboard/cards')).toBe(false);
    expect(isWidgetAllowed('VOICE_AGENT', '/dashboard/settings')).toBe(false);
  });

  it('strictly blocks widgets on protected admin routes', () => {
    expect(isWidgetAllowed('VOICE_AGENT', '/admin')).toBe(false);
    expect(isWidgetAllowed('VOICE_AGENT', '/admin/analytics')).toBe(false);
  });

  it('strictly blocks widgets on internal api routes', () => {
    expect(isWidgetAllowed('VOICE_AGENT', '/api/cron/notifications')).toBe(false);
  });

  it('rejects widgets on unauthorized public subpages', () => {
    expect(isWidgetAllowed('VOICE_AGENT', '/login')).toBe(false);
    expect(isWidgetAllowed('VOICE_AGENT', '/register')).toBe(false);
  });

  it('only allows telli-six.vercel.app as the approved origin for voice agent', () => {
    const config = ALLOWED_WIDGETS.VOICE_AGENT;
    expect(config.allowedOrigins).toContain('https://telli-six.vercel.app');
    expect(new URL(config.src).origin).toBe('https://telli-six.vercel.app');
  });
});
