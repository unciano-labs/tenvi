'use server';

import { createClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';
import { revalidatePath } from 'next/cache';
import { formatMoney, formatDate, calculateNextDueDate } from '@/lib/finance/calculations';
import { notificationSettingsSchema } from '@/lib/validations/schemas';
import {
  NotificationSettings,
  NotificationLog,
  CreditCard,
  GetNotificationLogsOptions,
  GetNotificationLogsResponse,
  NotificationLogsStats,
} from '@/types';
import {
  DEFAULT_LOAN_SMS_TEMPLATE,
  DEFAULT_LOAN_EMAIL_SUBJECT,
  DEFAULT_LOAN_EMAIL_BODY,
  DEFAULT_CARD_SMS_TEMPLATE,
  DEFAULT_CARD_EMAIL_SUBJECT,
  DEFAULT_CARD_EMAIL_BODY,
  interpolateTemplate,
  buildCardNotificationVariables,
} from '@/lib/notifications/templates';
import { sendGmailEmail, verifyGmailConnection } from '@/lib/notifications/email';
import { sendHttpSms, verifyHttpSmsConnection, formatPhoneNumberE164 } from '@/lib/notifications/sms';


/**
 * Normalizes Philippine mobile numbers to international E.164 format (+639XXXXXXXXX)
 */
export async function normalizePhoneNumber(phone: string): Promise<string> {
  const cleaned = phone.replace(/[^0-9+]/g, '');
  if (!cleaned) return '';

  if (cleaned.startsWith('09') && cleaned.length === 11) {
    return `+63${cleaned.slice(1)}`;
  }
  if (cleaned.startsWith('9') && cleaned.length === 10) {
    return `+63${cleaned}`;
  }
  if (cleaned.startsWith('639') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('+639') && cleaned.length === 13) {
    return cleaned;
  }
  return cleaned;
}

/**
 * Fetch or initialize notification settings for the authenticated user
 */
export async function getNotificationSettingsAction(): Promise<{
  settings: NotificationSettings | null;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { settings: null, error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('bili_notification_settings')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching notification settings:', error);
    return { settings: null, error: error.message };
  }

  // If no settings exist yet, return sensible defaults including standard templates
  if (!data) {
    return {
      settings: {
        id: '',
        website_id: WEBSITE_ID,
        user_id: user.id,
        notify_email: true,
        email_address: user.email || '',
        notify_sms: false,
        phone_number: '',
        days_before: 3,
        loan_sms_template: DEFAULT_LOAN_SMS_TEMPLATE,
        loan_email_subject: DEFAULT_LOAN_EMAIL_SUBJECT,
        loan_email_body: DEFAULT_LOAN_EMAIL_BODY,
        card_sms_template: DEFAULT_CARD_SMS_TEMPLATE,
        card_email_subject: DEFAULT_CARD_EMAIL_SUBJECT,
        card_email_body: DEFAULT_CARD_EMAIL_BODY,
        smtp_email: null,
        smtp_app_password: null,
        httpsms_api_key: null,
        httpsms_from_number: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  }

  const settings: NotificationSettings = {
    ...(data as NotificationSettings),
    loan_sms_template: data.loan_sms_template || DEFAULT_LOAN_SMS_TEMPLATE,
    loan_email_subject: data.loan_email_subject || DEFAULT_LOAN_EMAIL_SUBJECT,
    loan_email_body: data.loan_email_body || DEFAULT_LOAN_EMAIL_BODY,
    card_sms_template: data.card_sms_template || DEFAULT_CARD_SMS_TEMPLATE,
    card_email_subject: data.card_email_subject || DEFAULT_CARD_EMAIL_SUBJECT,
    card_email_body: data.card_email_body || DEFAULT_CARD_EMAIL_BODY,
    smtp_email: data.smtp_email || null,
    smtp_app_password: data.smtp_app_password || null,
    httpsms_api_key: data.httpsms_api_key || null,
    httpsms_from_number: data.httpsms_from_number || null,
  };

  return { settings };
}

/**
 * Save / Update notification preferences, message templates, and optional Gmail SMTP settings
 */
export async function saveNotificationSettingsAction(formData: {
  notifyEmail: boolean;
  emailAddress?: string | null;
  notifySms: boolean;
  phoneNumber?: string | null;
  daysBefore: number;
  loanSmsTemplate?: string | null;
  loanEmailSubject?: string | null;
  loanEmailBody?: string | null;
  cardSmsTemplate?: string | null;
  cardEmailSubject?: string | null;
  cardEmailBody?: string | null;
  smtpEmail?: string | null;
  smtpAppPassword?: string | null;
  httpsmsApiKey?: string | null;
  httpsmsFromNumber?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'You must be logged in to update notification settings.' };
  }

  const parsed = notificationSettingsSchema.safeParse(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid settings.' };
  }

  const {
    notifyEmail,
    emailAddress,
    notifySms,
    phoneNumber,
    daysBefore,
    loanSmsTemplate,
    loanEmailSubject,
    loanEmailBody,
    cardSmsTemplate,
    cardEmailSubject,
    cardEmailBody,
    smtpEmail,
    smtpAppPassword,
    httpsmsApiKey,
    httpsmsFromNumber,
  } = parsed.data;

  // Validate phone number if SMS is enabled
  let cleanPhone = '';
  if (phoneNumber) {
    cleanPhone = await normalizePhoneNumber(phoneNumber);
  }

  if (notifySms && !cleanPhone) {
    return { error: 'Please enter a valid mobile number for SMS alerts.' };
  }

  const targetEmail = emailAddress?.trim() || user.email || '';
  const cleanFromNumber = httpsmsFromNumber ? formatPhoneNumberE164(httpsmsFromNumber) : null;

  const { error } = await supabase
    .from('bili_notification_settings')
    .upsert(
      {
        website_id: WEBSITE_ID,
        user_id: user.id,
        notify_email: notifyEmail,
        email_address: targetEmail,
        notify_sms: notifySms,
        phone_number: cleanPhone,
        days_before: daysBefore,
        ...(loanSmsTemplate !== undefined ? { loan_sms_template: loanSmsTemplate } : {}),
        ...(loanEmailSubject !== undefined ? { loan_email_subject: loanEmailSubject } : {}),
        ...(loanEmailBody !== undefined ? { loan_email_body: loanEmailBody } : {}),
        ...(cardSmsTemplate !== undefined ? { card_sms_template: cardSmsTemplate } : {}),
        ...(cardEmailSubject !== undefined ? { card_email_subject: cardEmailSubject } : {}),
        ...(cardEmailBody !== undefined ? { card_email_body: cardEmailBody } : {}),
        ...(smtpEmail !== undefined ? { smtp_email: smtpEmail?.trim() || null } : {}),
        ...(smtpAppPassword !== undefined ? { smtp_app_password: smtpAppPassword?.trim() || null } : {}),
        ...(httpsmsApiKey !== undefined ? { httpsms_api_key: httpsmsApiKey?.trim() || null } : {}),
        ...(httpsmsFromNumber !== undefined ? { httpsms_from_number: cleanFromNumber } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'website_id,user_id' }
    );

  if (error) {
    console.error('Error saving notification settings:', error);
    return { error: 'Failed to save settings. Please try again.' };
  }

  revalidatePath('/dashboard/settings');
  revalidatePath('/dashboard/cards');
  return { success: true };
}

/**
 * Verify custom Gmail SMTP credentials connection on demand
 */
export async function verifyGmailSmtpAction(
  email: string,
  appPassword: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!email || !appPassword) {
    return {
      success: false,
      error: 'Please provide both your Gmail address and 16-character App Password.',
    };
  }

  const result = await verifyGmailConnection(email, appPassword);
  if (result.success) {
    return {
      success: true,
      message: 'Gmail SMTP handshake successful! Google authenticated your account.',
    };
  }
  return {
    success: false,
    error: result.error || 'Failed to authenticate with Gmail SMTP.',
  };
}

/**
 * Verify httpSMS API Key handshake and account validity on demand
 */
export async function verifyHttpSmsAction(
  apiKey: string,
  fromNumber?: string
): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!apiKey) {
    return {
      success: false,
      error: 'Please enter your httpSMS API key.',
    };
  }

  const result = await verifyHttpSmsConnection(apiKey, fromNumber);
  return result;
}


/**
 * Reset notification templates to system defaults
 */
export async function resetNotificationTemplatesAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('bili_notification_settings')
    .update({
      loan_sms_template: DEFAULT_LOAN_SMS_TEMPLATE,
      loan_email_subject: DEFAULT_LOAN_EMAIL_SUBJECT,
      loan_email_body: DEFAULT_LOAN_EMAIL_BODY,
      card_sms_template: DEFAULT_CARD_SMS_TEMPLATE,
      card_email_subject: DEFAULT_CARD_EMAIL_SUBJECT,
      card_email_body: DEFAULT_CARD_EMAIL_BODY,
      updated_at: new Date().toISOString(),
    })
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error resetting templates:', error);
    return { error: 'Failed to reset templates.' };
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}


/**
 * Check credit cards with upcoming due dates and dispatch notifications
 * Enforces the "once a day" rule per channel unless forceSend is specified.
 */
export async function checkAndSendCardDueAlertsAction({
  forceSend = false,
}: {
  forceSend?: boolean;
} = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  // 1. Fetch user's notification settings
  const { data: settings } = await supabase
    .from('bili_notification_settings')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  const notifyEmail = settings?.notify_email ?? true;
  const notifySms = settings?.notify_sms ?? false;
  const daysBefore = settings?.days_before ?? 3;
  const recipientEmail = settings?.email_address || user.email || '';
  const recipientPhone = settings?.phone_number || '';

  if (!notifyEmail && !notifySms) {
    return {
      message: 'Both Email and SMS notifications are turned off in settings.',
      dispatched: false,
    };
  }

  // 2. Fetch user's active credit cards
  const { data: cards, error: cardsError } = await supabase
    .from('bili_credit_cards')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('due_day', { ascending: true });

  if (cardsError || !cards || cards.length === 0) {
    return {
      message: 'No active credit cards found to check.',
      dispatched: false,
    };
  }

  // 3. Filter cards due within the specified window (e.g. within 3 days)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const upcomingCards = cards
    .map((c) => {
      const dueInfo = calculateNextDueDate(c.due_day, today);
      return {
        card: c,
        dueInfo,
      };
    })
    .filter((item) => item.dueInfo.daysRemaining >= 0 && item.dueInfo.daysRemaining <= daysBefore)
    .sort((a, b) => a.dueInfo.daysRemaining - b.dueInfo.daysRemaining);

  if (upcomingCards.length === 0) {
    return {
      message: `All good! No credit cards are due within the next ${daysBefore} days.`,
      dispatched: false,
      upcomingCount: 0,
    };
  }

  // 4. Check if notification has already been sent today (Once a Day rule)
  const { data: todayLogs } = await supabase
    .from('bili_notification_logs')
    .select('channel')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .eq('sent_date', todayStr);

  const channelsAlreadySent = new Set((todayLogs || []).map((l) => l.channel));

  const dispatchedChannels: string[] = [];
  const cardNamesList = upcomingCards.map((i) => `${i.card.bank_name} ${i.card.name}`).join(', ');

  // 5. Build friendly consolidated alert message
  const cardItemsSummary = upcomingCards
    .map(
      (item, idx) =>
        `${idx + 1}) ${item.card.bank_name} ${item.card.name} (•••• ${item.card.last_4}): ${item.dueInfo.label} (${formatDate(item.dueInfo.nextDueDate)})${item.card.credit_limit > 0 ? ` • Limit ${formatMoney(item.card.credit_limit)}` : ''}`
    )
    .join('\n');

  const cardVars = buildCardNotificationVariables({
    cardCount: upcomingCards.length,
    cardList: cardItemsSummary,
    daysBefore,
    appUrl: 'https://tenvi.app/dashboard/cards',
  });

  const smsTemplate = settings?.card_sms_template || DEFAULT_CARD_SMS_TEMPLATE;
  const emailSubTemplate = settings?.card_email_subject || DEFAULT_CARD_EMAIL_SUBJECT;
  const emailBodyTemplate = settings?.card_email_body || DEFAULT_CARD_EMAIL_BODY;

  const smsBody = interpolateTemplate(smsTemplate, cardVars);
  const emailSubject = interpolateTemplate(emailSubTemplate, cardVars);
  const emailBody = interpolateTemplate(emailBodyTemplate, cardVars);


  // 6. Send SMS if enabled and not yet sent today (or forceSend)
  if (notifySms && recipientPhone) {
    if (forceSend || !channelsAlreadySent.has('sms')) {
      const smsRes = await sendHttpSms({
        to: recipientPhone,
        message: smsBody,
        customApiKey: settings?.httpsms_api_key,
        customFrom: settings?.httpsms_from_number,
      });

      const { error: logErr } = await supabase.from('bili_notification_logs').insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
        channel: 'sms',
        recipient: recipientPhone,
        card_names: cardNamesList,
        message_body: smsBody,
        status: smsRes.status,
        error_message: smsRes.error || null,
        sent_date: todayStr,
      });

      if (!logErr && smsRes.success) {
        dispatchedChannels.push(`SMS to ${recipientPhone} (${smsRes.status})`);
      }
    }
  }

  // 7. Send Email if enabled and not yet sent today (or forceSend)
  if (notifyEmail && recipientEmail) {
    if (forceSend || !channelsAlreadySent.has('email')) {
      const emailRes = await sendGmailEmail({
        to: recipientEmail,
        subject: emailSubject,
        text: emailBody,
        customUser: settings?.smtp_email,
        customPass: settings?.smtp_app_password,
      });

      const { error: logErr } = await supabase.from('bili_notification_logs').insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
        channel: 'email',
        recipient: recipientEmail,
        card_names: cardNamesList,
        email_subject: emailSubject,
        message_body: emailBody,
        status: emailRes.status,
        error_message: emailRes.error || null,
        sent_date: todayStr,
      });

      if (!logErr && emailRes.success) {
        dispatchedChannels.push(`Email to ${recipientEmail} (${emailRes.status})`);
      }
    }
  }

  // 8. Update last_notified_at in settings
  if (dispatchedChannels.length > 0) {
    await supabase
      .from('bili_notification_settings')
      .update({ last_notified_at: new Date().toISOString() })
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id);
  }

  revalidatePath('/dashboard/settings');

  if (dispatchedChannels.length === 0) {
    return {
      message: `Reminders were already sent today for your ${upcomingCards.length} upcoming card(s). The system sends once per day.`,
      dispatched: false,
      upcomingCount: upcomingCards.length,
    };
  }

  return {
    success: true,
    message: `Reminder dispatched successfully via ${dispatchedChannels.join(' and ')} for ${upcomingCards.length} upcoming bill(s).`,
    dispatched: true,
    upcomingCount: upcomingCards.length,
    channels: dispatchedChannels,
  };
}

/**
 * Dispatch an instant test notification to verify the nominated phone number or email
 */
export async function sendTestNotificationAction(
  channel: 'email' | 'sms',
  options?: {
    recipient?: string;
    apiKey?: string;
    fromNumber?: string;
    smtpEmail?: string;
    smtpAppPassword?: string;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const { data: settings } = await supabase
    .from('bili_notification_settings')
    .select('*')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id)
    .maybeSingle();

  const rawRecipient =
    options?.recipient?.trim() ||
    (channel === 'sms'
      ? settings?.phone_number || ''
      : settings?.email_address || user.email || '');

  const recipient =
    channel === 'sms' ? await normalizePhoneNumber(rawRecipient) : rawRecipient;

  if (!recipient) {
    return {
      error: `Please enter a valid ${channel === 'sms' ? 'mobile number' : 'email address'} first.`,
    };
  }

  let logStatus: 'sent' | 'simulated' | 'failed' = 'sent';
  let logError: string | null = null;
  let testSubject = '[Tenvi Test Alert]';
  let messageBody = '';

  if (channel === 'email') {
    testSubject = '[Tenvi Test] Gmail Notification Connected Successfully';
    messageBody = `Kumusta!\n\nThis is a test notification confirming your email alerts are connected and active on Tenvi.\n\nYou will receive automated alerts 3 days before credit card bills or loan installments are due.\n\nSent via Gmail SMTP.`;

    const emailRes = await sendGmailEmail({
      to: recipient,
      subject: testSubject,
      text: messageBody,
      customUser: options?.smtpEmail?.trim() || settings?.smtp_email,
      customPass: options?.smtpAppPassword?.trim() || settings?.smtp_app_password,
    });

    logStatus = emailRes.status;
    logError = emailRes.error || null;
  } else {
    messageBody = `[Tenvi Alert] Kumusta! Your phone number ${recipient} is connected to Tenvi via httpSMS. You will receive automated alerts before due dates.`;

    const smsRes = await sendHttpSms({
      to: recipient,
      message: messageBody,
      customApiKey: options?.apiKey?.trim() || settings?.httpsms_api_key,
      customFrom: options?.fromNumber?.trim() || settings?.httpsms_from_number,
    });

    logStatus = smsRes.status;
    logError = smsRes.error || null;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  const { error: logErr } = await supabase.from('bili_notification_logs').insert({
    website_id: WEBSITE_ID,
    user_id: user.id,
    channel,
    recipient,
    card_names: 'Test Notification',
    email_subject: channel === 'email' ? testSubject : null,
    message_body: messageBody,
    status: logStatus,
    error_message: logError,
    sent_date: todayStr,
  });

  if (logErr) {
    console.error('Error logging test notification:', logErr);
    return { error: 'Failed to record test alert log.' };
  }

  revalidatePath('/dashboard/settings');

  if (logStatus === 'failed') {
    const errorPrefix = channel === 'email' ? 'Gmail SMTP' : 'httpSMS';
    return {
      error: `Failed to dispatch ${channel.toUpperCase()} via ${errorPrefix}: ${logError || 'Check credentials'}. See Notification History below for status details.`,
    };
  }

  if (logStatus === 'simulated') {
    return {
      error: `Simulation Mode: ${logError || 'Credentials not fully configured'}. Real ${channel.toUpperCase()} was not dispatched.`,
    };
  }

  return {
    success: true,
    message: `Test ${channel.toUpperCase()} dispatched successfully to ${recipient}! Check notification history below.`,
  };
}


/**
 * Fetch notification logs / history for the current user with search, filter, pagination, and stats
 */
export async function getNotificationLogsAction(
  options: GetNotificationLogsOptions = {}
): Promise<GetNotificationLogsResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { logs: [], totalCount: 0, hasMore: false, page: 1, error: 'Unauthorized' };
  }

  const {
    page = 1,
    limit = 15,
    search = '',
    channel = 'all',
    status = 'all',
  } = options;

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 15));
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;

  // 1. Fetch aggregate stats across all user's notification logs (for summary pills)
  const { data: allStatsRows } = await supabase
    .from('bili_notification_logs')
    .select('channel, status')
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);

  const stats: NotificationLogsStats = {
    total: allStatsRows?.length || 0,
    sent: allStatsRows?.filter((r) => r.status === 'sent').length || 0,
    simulated: allStatsRows?.filter((r) => r.status === 'simulated').length || 0,
    failed: allStatsRows?.filter((r) => r.status === 'failed').length || 0,
    email: allStatsRows?.filter((r) => r.channel === 'email').length || 0,
    sms: allStatsRows?.filter((r) => r.channel === 'sms').length || 0,
  };

  // 2. Build filtered paginated query
  let query = supabase
    .from('bili_notification_logs')
    .select(`
      *,
      document:bili_property_documents(title, property:bili_properties(name))
    `, { count: 'exact' })
    .eq('website_id', WEBSITE_ID)
    .eq('user_id', user.id);


  if (channel && channel !== 'all') {
    query = query.eq('channel', channel);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search && search.trim()) {
    const cleanTerm = search.trim().replace(/[%_,'"\(\)]/g, ' ').trim();
    if (cleanTerm) {
      const termPattern = `%${cleanTerm}%`;
      query = query.or(
        `recipient.ilike.${termPattern},email_subject.ilike.${termPattern},message_body.ilike.${termPattern},card_names.ilike.${termPattern},error_message.ilike.${termPattern}`
      );
    }
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Error fetching logs:', error);
    return {
      logs: [],
      totalCount: 0,
      hasMore: false,
      page: safePage,
      stats,
      error: error.message,
    };
  }

  const totalCount = count || 0;
  const hasMore = to < totalCount - 1;

  return {
    logs: (data || []) as NotificationLog[],
    totalCount,
    hasMore,
    page: safePage,
    stats,
  };
}
