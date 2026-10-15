export type BroadcastCategory = 'feature_update' | 'maintenance' | 'announcement' | 'security_notice';
export type BroadcastAudience = 'all_members' | 'admins_only' | 'test_only';

export interface BroadcastRecord {
  id: string;
  website_id: string;
  admin_id: string;
  subject: string;
  category: BroadcastCategory;
  message: string;
  audience: BroadcastAudience;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  simulated_count: number;
  send_in_app: boolean;
  created_at: string;
  admin_name?: string;
  admin_email?: string;
}

export interface BroadcastSubmissionData {
  subject: string;
  category: BroadcastCategory;
  message: string;
  audience: BroadcastAudience;
  send_in_app: boolean;
}

/**
 * Formats a premium, responsive HTML email for platform announcements.
 */
export function generateBroadcastEmailHtml(options: {
  subject: string;
  message: string;
  category: BroadcastCategory;
  recipientName?: string;
}): string {
  const { subject, message, category, recipientName = 'Member' } = options;

  const categoryLabels: Record<BroadcastCategory, { label: string; color: string; bg: string }> = {
    feature_update: { label: 'FEATURE UPDATE', color: '#7C3AED', bg: '#F5F3FF' },
    announcement: { label: 'PLATFORM ANNOUNCEMENT', color: '#2563EB', bg: '#EFF6FF' },
    maintenance: { label: 'SCHEDULED MAINTENANCE', color: '#D97706', bg: '#FFFBEB' },
    security_notice: { label: 'SECURITY NOTICE', color: '#DC2626', bg: '#FEF2F2' },
  };

  const badge = categoryLabels[category] || categoryLabels.announcement;

  const formattedBlocks = message
    .replace(/\r\n/g, '\n')
    .split('\n\n')
    .map(
      (block) =>
        `<p style="margin: 0 0 16px 0; line-height: 1.65; color: #334155; font-size: 14.5px;">${block.replace(
          /\n/g,
          '<br/>'
        )}</p>`
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 28px 16px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 14px rgba(15,23,42,0.06); overflow: hidden; border: 1px solid #E2E8F0;">
    <!-- Top Branded Header -->
    <tr>
      <td style="padding: 32px 32px 20px 32px; background-color: #ffffff; border-bottom: 1px solid #F1F5F9;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <span style="font-size: 22px; font-weight: 900; color: #0F172A; letter-spacing: -0.5px;">Tenvi</span>
              <span style="display: inline-block; margin-left: 10px; font-size: 10.5px; font-weight: 800; color: ${badge.color}; background-color: ${badge.bg}; padding: 3px 10px; border-radius: 9999px; letter-spacing: 0.5px;">
                ${badge.label}
              </span>
            </td>
          </tr>
        </table>
        <h1 style="margin: 22px 0 0 0; font-size: 20px; font-weight: 800; color: #0F172A; line-height: 1.35; letter-spacing: -0.3px;">
          ${subject}
        </h1>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 28px 32px 24px 32px;">
        <p style="margin: 0 0 16px 0; font-size: 15px; font-weight: 700; color: #0F172A;">
          Hello ${recipientName},
        </p>
        ${formattedBlocks}

        <!-- CTA Button -->
        <table border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 12px 0;">
          <tr>
            <td align="center" style="border-radius: 12px; background-color: #2563EB;">
              <a href="https://tenvi.app/dashboard" target="_blank" style="font-size: 13.5px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 12px 24px; display: inline-block; border-radius: 12px;">
                Open Your Tenvi Dashboard &rarr;
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #F1F5F9; font-size: 12px; color: #64748B;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <p style="margin: 0; font-weight: 700; color: #334155;">Tenvi — Personal Wealth Infrastructure</p>
              <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 11px; line-height: 1.5;">
                This message was broadcast by the Tenvi administration team to registered members.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
