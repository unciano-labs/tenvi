import { ALLOWED_WIDGETS, isWidgetAllowed } from '@/lib/config/widgets';

interface VoiceAgentWidgetProps {
  currentPath?: string;
}

/**
 * Renders the approved Voice Support Widget only if the widget ID, origin,
 * and current route strictly pass security allowlist validation.
 */
export function VoiceAgentWidget({ currentPath = '/' }: VoiceAgentWidgetProps) {
  if (!isWidgetAllowed('VOICE_AGENT', currentPath)) {
    return null;
  }

  const widget = ALLOWED_WIDGETS.VOICE_AGENT;

  return (
    <script
      src={widget.src}
      data-key={widget.key}
      async
    />
  );
}

