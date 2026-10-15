'use server';

import { revalidatePath } from 'next/cache';
import { requireWebsiteAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID, ADMIN_EMAIL, isUserAdmin } from '@/lib/constants';
import { sendGmailEmail, getGmailSmtpConfig, getAdminPlatformSmtpConfig } from '@/lib/notifications/email';
import { sendMemberInAppNotification } from '@/app/actions/inAppNotifications';

import {
  generateBroadcastEmailHtml,
  type BroadcastCategory,
  type BroadcastAudience,
  type BroadcastRecord,
  type BroadcastSubmissionData,
} from '@/lib/notifications/broadcastTemplate';

export type {
  BroadcastCategory,
  BroadcastAudience,
  BroadcastRecord,
  BroadcastSubmissionData,
};

/**
 * Returns statistics and SMTP configuration state for the email blast dashboard.
 */
export async function getBroadcastStatsAction(): Promise<{
  totalBroadcasts: number;
  totalDelivered: number;
  activeMemberCount: number;
  smtpConfigured: boolean;
  smtpUser: string;
  adminEmail: string;
  error?: string;
}> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return {
      totalBroadcasts: 0,
      totalDelivered: 0,
      activeMemberCount: 0,
      smtpConfigured: false,
      smtpUser: '',
      adminEmail: '',
      error: 'Unauthorized',
    };
  }

  try {
    const admin = createAdminClient();
    const smtp = await getAdminPlatformSmtpConfig(auth.user.id);

    // 1. Fetch total broadcasts and sum of sent_count
    const { data: broadcasts } = await admin
      .from('bili_broadcasts')
      .select('sent_count, simulated_count')
      .eq('website_id', WEBSITE_ID);

    const totalBroadcasts = (broadcasts || []).length;
    const totalDelivered = (broadcasts || []).reduce(
      (sum, b) => sum + (b.sent_count || 0) + (b.simulated_count || 0),
      0
    );

    // 2. Fetch member count from RPC
    const { data: members } = await admin.rpc('get_admin_members_list', {
      p_website_id: WEBSITE_ID,
      p_search: null,
      p_status: 'all',
      p_limit: 500,
      p_cursor_created_at: null,
      p_cursor_id: null,
    });

    const activeMemberCount = (members || []).length;

    return {
      totalBroadcasts,
      totalDelivered,
      activeMemberCount,
      smtpConfigured: smtp.isConfigured,
      smtpUser: smtp.user ? smtp.user.slice(0, 3) + '***@' + (smtp.user.split('@')[1] || '') : '',
      adminEmail: auth.user.email || ADMIN_EMAIL,
    };
  } catch (err: any) {
    console.error('[getBroadcastStatsAction] Error:', err);
    return {
      totalBroadcasts: 0,
      totalDelivered: 0,
      activeMemberCount: 0,
      smtpConfigured: false,
      smtpUser: '',
      adminEmail: '',
      error: err.message,
    };
  }
}

/**
 * Returns past broadcast announcements with sender details.
 */
export async function getBroadcastHistoryAction(): Promise<{
  broadcasts: BroadcastRecord[];
  error?: string;
}> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { broadcasts: [], error: 'Unauthorized' };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('bili_broadcasts')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Enrich with sender admin profile
    const adminIds = Array.from(new Set((data || []).map((b) => b.admin_id)));
    let adminMap: Record<string, { email: string; full_name: string }> = {};

    if (adminIds.length > 0) {
      const { data: profiles } = await admin
        .from('user_profiles')
        .select('user_id, email, full_name')
        .in('user_id', adminIds);

      (profiles || []).forEach((p) => {
        adminMap[p.user_id] = { email: p.email, full_name: p.full_name };
      });
    }

    const broadcasts: BroadcastRecord[] = (data || []).map((b) => ({
      ...b,
      admin_name: adminMap[b.admin_id]?.full_name || 'Administrator',
      admin_email: adminMap[b.admin_id]?.email || '',
    }));

    return { broadcasts };
  } catch (err: any) {
    console.error('[getBroadcastHistoryAction] Error:', err);
    return { broadcasts: [], error: err.message };
  }
}

/**
 * Dispatches an email blast / announcement to members and records delivery metrics.
 */
export async function sendEmailBroadcastAction(
  data: BroadcastSubmissionData
): Promise<{
  success: boolean;
  broadcastId?: string;
  recipientCount?: number;
  sentCount?: number;
  simulatedCount?: number;
  failedCount?: number;
  error?: string;
}> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: 'Unauthorized: Admin privileges required' };
  }

  const { subject, category, message, audience, send_in_app } = data;

  if (!subject?.trim()) {
    return { success: false, error: 'Subject is required' };
  }
  if (!message?.trim() || message.trim().length < 5) {
    return { success: false, error: 'Message must be at least 5 characters long' };
  }

  try {
    const admin = createAdminClient();

    // 0. Resolve active Platform Gmail SMTP credentials
    const smtp = await getAdminPlatformSmtpConfig(auth.user.id);
    if (!smtp.isConfigured) {
      return {
        success: false,
        error:
          'Gmail SMTP credentials are not configured. Please set your Gmail address and 16-character App Password in Settings or environment variables.',
      };
    }

    // 1. Resolve recipients list
    interface Recipient {
      user_id: string;
      email: string;
      full_name: string;
    }

    let recipients: Recipient[] = [];

    if (audience === 'test_only') {
      recipients = [
        {
          user_id: auth.user.id,
          email: auth.user.email || ADMIN_EMAIL,
          full_name: (auth.user.user_metadata?.full_name as string) || 'Admin Test',
        },
      ];
    } else {
      // Fetch members from directory RPC
      const { data: memberList, error: memberErr } = await admin.rpc('get_admin_members_list', {
        p_website_id: WEBSITE_ID,
        p_search: null,
        p_status: 'all',
        p_limit: 500,
        p_cursor_created_at: null,
        p_cursor_id: null,
      });

      if (memberErr) throw memberErr;

      const rawMembers = (memberList || []) as {
        user_id: string;
        email: string;
        full_name: string;
        is_banned: boolean;
      }[];

      if (audience === 'admins_only') {
        recipients = rawMembers
          .filter((m) => isUserAdmin(m.email))
          .map((m) => ({ user_id: m.user_id, email: m.email, full_name: m.full_name || 'Admin' }));
      } else {
        // all_members (filter out empty emails)
        recipients = rawMembers
          .filter((m) => m.email && m.email.includes('@'))
          .map((m) => ({
            user_id: m.user_id,
            email: m.email,
            full_name: m.full_name || m.email.split('@')[0] || 'Member',
          }));
      }
    }

    if (recipients.length === 0) {
      return { success: false, error: 'No eligible recipients found for this audience' };
    }

    // 2. Insert Broadcast Record
    const { data: broadcastRecord, error: insertErr } = await admin
      .from('bili_broadcasts')
      .insert({
        website_id: WEBSITE_ID,
        admin_id: auth.user.id,
        subject: subject.trim(),
        category,
        message: message.trim(),
        audience,
        recipient_count: recipients.length,
        send_in_app: Boolean(send_in_app),
      })
      .select('id')
      .single();

    if (insertErr || !broadcastRecord) {
      throw insertErr || new Error('Failed to create broadcast entry');
    }

    const broadcastId = broadcastRecord.id;

    // 3. Dispatch Emails & In-App Notifications
    // Paced delivery: 1,500ms interval delay between sends to protect sender reputation & prevent Google anti-spam bans
    const INTERVAL_DELAY_MS = audience === 'test_only' ? 0 : 1500;
    let sentCount = 0;
    let simulatedCount = 0;
    let failedCount = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];

      // Pacing delay between successive outgoing emails (prevents burst rate-limiting)
      if (i > 0 && INTERVAL_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, INTERVAL_DELAY_MS));
      }

      const emailHtml = generateBroadcastEmailHtml({
        subject: subject.trim(),
        message: message.trim(),
        category,
        recipientName: r.full_name,
      });

      // Dispatch real email via configured Gmail SMTP
      const result = await sendGmailEmail({
        to: r.email,
        subject: subject.trim(),
        text: message.trim(),
        html: emailHtml,
        customUser: smtp.user,
        customPass: smtp.pass,
      });

      if (result.status === 'sent') sentCount++;
      else if (result.status === 'simulated') simulatedCount++;
      else failedCount++;

      // Log in bili_notification_logs
      try {
        await admin.from('bili_notification_logs').insert({
          website_id: WEBSITE_ID,
          user_id: r.user_id,
          channel: 'email',
          recipient: r.email,
          email_subject: subject.trim(),
          message_body: message.trim(),
          status: result.status,
          sent_date: todayStr,
          error_message: result.error || null,
        });
      } catch (logErr) {
        console.error('[sendEmailBroadcastAction] Notification log insert error:', logErr);
      }

      // Optional in-app notification
      if (send_in_app && audience !== 'test_only') {
        try {
          await sendMemberInAppNotification(
            r.user_id,
            `Announcement: ${subject.trim()}`,
            message.trim().slice(0, 110) + (message.length > 110 ? '...' : ''),
            '/dashboard',
            'system'
          );
        } catch (notifErr) {
          console.error('[sendEmailBroadcastAction] In-app notification error:', notifErr);
        }
      }
    }

    // 4. Update final delivery stats on broadcast record
    await admin
      .from('bili_broadcasts')
      .update({
        sent_count: sentCount,
        simulated_count: simulatedCount,
        failed_count: failedCount,
      })
      .eq('id', broadcastId);

    revalidatePath('/admin/broadcast');
    revalidatePath('/admin/members');

    return {
      success: true,
      broadcastId,
      recipientCount: recipients.length,
      sentCount,
      simulatedCount,
      failedCount,
    };
  } catch (err: any) {
    console.error('[sendEmailBroadcastAction] Fatal error:', err);
    return { success: false, error: err.message || 'Failed to dispatch email broadcast' };
  }
}
