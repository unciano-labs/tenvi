/**
 * Strict allowlist and runtime validator for external widgets embedded in Tenvi.
 * Ensures that only explicitly approved widgets with verified domains and keys
 * can execute, strictly isolated to authorized routes (e.g. landing page only).
 */

export interface AllowedWidgetConfig {
  id: string;
  name: string;
  src: string;
  allowedOrigins: readonly string[];
  key: string;
  enabled: boolean;
  allowedPaths: readonly string[];
}

export const ALLOWED_WIDGETS = {
  VOICE_AGENT: {
    id: 'telli-voice-agent',
    name: 'Telli Voice Support Agent',
    src: 'https://telli-six.vercel.app/widget.js',
    allowedOrigins: ['https://telli-six.vercel.app'],
    key: process.env.NEXT_PUBLIC_VOICE_AGENT_WIDGET_KEY || 'wk_SL5rtc77Z1lM-xX1',
    enabled: true,
    allowedPaths: ['/'],
  },
} satisfies Record<string, AllowedWidgetConfig>;

/**
 * Validates whether a widget is authorized to run on the given route.
 * Rejects unlisted widget IDs, disabled widgets, unapproved origins, or protected routes.
 */
export function isWidgetAllowed(
  widgetId: keyof typeof ALLOWED_WIDGETS,
  currentPath: string = '/'
): boolean {
  const widget = ALLOWED_WIDGETS[widgetId];
  if (!widget || !widget.enabled) {
    return false;
  }

  // Verify that the script src domain strictly matches the allowlisted origins
  try {
    const url = new URL(widget.src);
    if (!widget.allowedOrigins.includes(url.origin)) {
      console.warn(
        `[WidgetSecurity] Blocked widget "${widgetId}": origin "${url.origin}" is not in the approved allowlist.`
      );
      return false;
    }
  } catch {
    console.warn(`[WidgetSecurity] Blocked widget "${widgetId}": invalid src URL "${widget.src}".`);
    return false;
  }

  // Never allow widgets on authenticated financial routes (dashboard, admin)
  const isProtectedArea =
    currentPath.startsWith('/dashboard') ||
    currentPath.startsWith('/admin') ||
    currentPath.startsWith('/api');

  if (isProtectedArea) {
    console.warn(
      `[WidgetSecurity] Blocked widget "${widgetId}": attempting to load on protected route "${currentPath}".`
    );
    return false;
  }

  // Verify that the current route matches the widget's allowed paths
  const isPathPermitted = widget.allowedPaths.some(
    (allowedPath) => currentPath === allowedPath || (allowedPath !== '/' && currentPath.startsWith(allowedPath))
  );

  if (!isPathPermitted) {
    console.warn(
      `[WidgetSecurity] Blocked widget "${widgetId}": route "${currentPath}" is not in allowedPaths.`
    );
    return false;
  }

  return true;
}
