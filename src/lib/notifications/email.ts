import nodemailer from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  customUser?: string | null;
  customPass?: string | null;
}

export interface SendEmailResult {
  success: boolean;
  status: 'sent' | 'simulated' | 'failed';
  messageId?: string;
  error?: string;
}

/**
 * Resolve active Gmail SMTP credentials
 * Prioritizes user-provided custom settings, then environment variables.
 */
export function getGmailSmtpConfig(customUser?: string | null, customPass?: string | null) {
  const user =
    customUser?.trim() ||
    process.env.GMAIL_USER ||
    process.env.SMTP_USER ||
    process.env.SMTP_EMAIL ||
    '';

  const pass =
    customPass?.trim() ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.GMAIL_PASS ||
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    '';

  const fromName = process.env.GMAIL_FROM_NAME || 'Tenvi Wealth Infrastructure';
  const isConfigured = Boolean(user && pass);

  return {
    user,
    pass,
    fromName,
    isConfigured,
  };
}

/**
 * Creates a Nodemailer transporter for Gmail SMTP
 */
function createGmailTransporter(user: string, pass: string) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: user.replace(/\s+/g, ''),
      pass: pass.replace(/\s+/g, ''), // App passwords often copied with spaces
    },
  });
}

/**
 * Generates clean, responsive HTML email styling for notifications
 */
export function generateNotificationHtml(subject: string, textBody: string): string {
  // Convert newlines to HTML paragraphs/breaks
  const formattedContent = textBody
    .replace(/\r\n/g, '\n')
    .split('\n\n')
    .map((block) => `<p style="margin: 0 0 16px 0; line-height: 1.6; color: #334155;">${block.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); overflow: hidden;">
    <!-- Header -->
    <tr>
      <td style="padding: 32px 32px 20px 32px; background-color: #ffffff;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <span style="display: inline-block; font-size: 20px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px;">Tenvi</span>
              <span style="display: inline-block; margin-left: 8px; font-size: 11px; font-weight: 700; color: #2563EB; background-color: #EFF6FF; padding: 3px 8px; border-radius: 12px;">Alert</span>
            </td>
          </tr>
        </table>
        <h1 style="margin: 20px 0 0 0; font-size: 18px; font-weight: 700; color: #0F172A; line-height: 1.4;">
          ${subject}
        </h1>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 10px 32px 24px 32px; font-size: 14px; color: #334155;">
        ${formattedContent}
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 24px 32px; background-color: #F8FAFC; border-top: 1px solid #F1F5F9; font-size: 12px; color: #64748B;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <p style="margin: 0; font-weight: 600; color: #475569;">Tenvi — Personal Wealth Infrastructure Platform</p>
              <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 11px;">Automated notification sent via Gmail SMTP.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends an email notification using Gmail SMTP
 * Gracefully handles unconfigured environments without crashing.
 */
export async function sendGmailEmail({
  to,
  subject,
  text,
  html,
  customUser,
  customPass,
}: SendEmailOptions): Promise<SendEmailResult> {
  const config = getGmailSmtpConfig(customUser, customPass);

  // If no Gmail credentials configured, record as simulated with explanation
  if (!config.isConfigured) {
    console.info(`[Email Service] Gmail SMTP credentials not set. Simulated email to: ${to} (Subject: ${subject})`);
    return {
      success: true,
      status: 'simulated',
      messageId: `simulated-${Date.now()}`,
      error: 'Gmail credentials not configured in environment or settings (Delivered in simulation mode).',
    };
  }

  try {
    const transporter = createGmailTransporter(config.user, config.pass);

    const fromAddress = `"${config.fromName}" <${config.user}>`;
    const emailHtml = html || generateNotificationHtml(subject, text);

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      text,
      html: emailHtml,
    });

    console.log(`[Email Service] Email sent successfully via Gmail SMTP to ${to}. Message ID: ${info.messageId}`);

    return {
      success: true,
      status: 'sent',
      messageId: info.messageId,
    };
  } catch (error: any) {
    console.error(`[Email Service] Error sending email via Gmail SMTP to ${to}:`, error);

    return {
      success: false,
      status: 'failed',
      error: error?.message || 'Failed to dispatch email via Gmail SMTP.',
    };
  }
}

/**
 * Verify Gmail SMTP credentials connection
 */
export async function verifyGmailConnection(user: string, pass: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const transporter = createGmailTransporter(user, pass);
    await transporter.verify();
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'SMTP Authentication failed. Check your Gmail App Password.',
    };
  }
}
