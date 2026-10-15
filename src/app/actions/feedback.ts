'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, requireWebsiteAdmin, getWebsiteUserRole } from '@/lib/auth/guards';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID, isUserAdmin } from '@/lib/constants';
import {
  sendMemberInAppNotification,
  notifyAdminsInAppNotification,
} from './inAppNotifications';

export type FeedbackType = 'bug' | 'feature' | 'accounting_issue' | 'ux_ui' | 'other';
export type FeedbackStatus = 'new' | 'open' | 'in_progress' | 'resolved' | 'closed' | 'wont_fix';
export type FeedbackPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface FeedbackSubmissionData {
  title?: string;
  type: FeedbackType;
  message: string;
  page_url?: string;
  device_meta?: Record<string, any>;
  priority?: FeedbackPriority;
}

export interface FeedbackMessageRecord {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'admin' | 'member';
  message: string;
  created_at: string;
  sender_name?: string;
  sender_email?: string;
}

export interface SupportTicketRecord {
  id: string;
  website_id: string;
  user_id: string;
  title: string | null;
  type: FeedbackType;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  message: string;
  page_url: string | null;
  device_meta: Record<string, any>;
  dev_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
  messages_count?: number;
}

/**
 * Member action to submit a direct bug report or support ticket.
 * Automatically alerts platform administrators via in-app notifications.
 */
export async function submitFeedbackAction(
  data: FeedbackSubmissionData
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: 'Authentication required to submit ticket' };
  }

  if (!data.message || data.message.trim().length < 5) {
    return { success: false, error: 'Please enter a descriptive message (min 5 characters)' };
  }

  const title =
    data.title?.trim() ||
    data.message.trim().slice(0, 60) + (data.message.length > 60 ? '...' : '');

  try {
    const supabase = await createClient();
    const { data: inserted, error } = await supabase
      .from('bili_feedback')
      .insert({
        website_id: WEBSITE_ID,
        user_id: user.id,
        title,
        type: data.type || 'other',
        status: 'open',
        priority: data.priority || 'normal',
        message: data.message.trim(),
        page_url: data.page_url || null,
        device_meta: data.device_meta || {},
      })
      .select('id')
      .single();

    if (error) throw error;

    // Dispatch automated in-app notification to all administrators
    const reporterName =
      (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Member';

    await notifyAdminsInAppNotification(
      `New ${data.type.replace('_', ' ').toUpperCase()}: ${title}`,
      `${reporterName} submitted: "${data.message.slice(0, 90)}..."`,
      `/admin/feedback?id=${inserted.id}`,
      'ticket_new'
    );

    revalidatePath('/dashboard/support');
    revalidatePath('/admin/feedback');

    return { success: true, ticketId: inserted.id };
  } catch (err: any) {
    console.error('[submitFeedbackAction] Error:', err);
    return { success: false, error: err.message || 'Failed to submit ticket' };
  }
}

/**
 * Member action to fetch all tickets submitted by themselves.
 */
export async function getMemberTicketsAction(): Promise<{
  tickets: SupportTicketRecord[];
  error?: string;
}> {
  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) {
    return { tickets: [], error: 'Unauthorized' };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('bili_feedback')
      .select('*, bili_feedback_messages(count)')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const tickets: SupportTicketRecord[] = (data || []).map((t: any) => ({
      ...t,
      messages_count: t.bili_feedback_messages?.[0]?.count || 0,
    }));

    return { tickets };
  } catch (err: any) {
    console.error('[getMemberTicketsAction] Error:', err);
    return { tickets: [], error: err.message || 'Failed to fetch tickets' };
  }
}

/**
 * Fetches complete ticket details and full conversation thread.
 * Authorized for the reporting user or platform administrators.
 */
export async function getTicketThreadAction(ticketId: string): Promise<{
  ticket: SupportTicketRecord | null;
  messages: FeedbackMessageRecord[];
  isAdminViewer: boolean;
  error?: string;
}> {
  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) {
    return { ticket: null, messages: [], isAdminViewer: false, error: 'Unauthorized' };
  }

  try {
    const adminClient = createAdminClient();
    const role = await getWebsiteUserRole(user.id, WEBSITE_ID);
    const isEnvAdmin = isUserAdmin(user.email);
    const isAdminViewer = role === 'admin' || Boolean(isEnvAdmin);

    // 1. Fetch ticket
    const { data: ticket, error: ticketError } = await adminClient
      .from('bili_feedback')
      .select('*')
      .eq('id', ticketId)
      .eq('website_id', WEBSITE_ID)
      .maybeSingle();

    if (ticketError || !ticket) {
      return { ticket: null, messages: [], isAdminViewer, error: 'Ticket not found' };
    }

    // Access check: only reporter or admin can access
    if (ticket.user_id !== user.id && !isAdminViewer) {
      return { ticket: null, messages: [], isAdminViewer: false, error: 'Access denied' };
    }

    // 2. Fetch reporter profile
    const { data: reporterProfile } = await adminClient
      .from('user_profiles')
      .select('email, full_name')
      .eq('user_id', ticket.user_id)
      .maybeSingle();

    // 3. Fetch all thread messages
    const { data: rawMessages, error: msgError } = await adminClient
      .from('bili_feedback_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (msgError) throw msgError;

    // Fetch names of senders in the thread
    const senderIds = Array.from(new Set((rawMessages || []).map((m) => m.sender_id)));
    let senderMap: Record<string, { email: string; full_name: string }> = {};

    if (senderIds.length > 0) {
      const { data: senderProfiles } = await adminClient
        .from('user_profiles')
        .select('user_id, email, full_name')
        .in('user_id', senderIds);

      (senderProfiles || []).forEach((p) => {
        senderMap[p.user_id] = { email: p.email, full_name: p.full_name };
      });
    }

    const messages: FeedbackMessageRecord[] = (rawMessages || []).map((m) => ({
      ...m,
      sender_name:
        m.sender_role === 'admin'
          ? 'Tenvi Support Team'
          : senderMap[m.sender_id]?.full_name || 'Member',
      sender_email: senderMap[m.sender_id]?.email || '',
    }));

    const enrichedTicket: SupportTicketRecord = {
      ...ticket,
      user_email: reporterProfile?.email || '',
      user_name: reporterProfile?.full_name || 'Member',
      messages_count: messages.length,
    };

    return {
      ticket: enrichedTicket,
      messages,
      isAdminViewer,
    };
  } catch (err: any) {
    console.error('[getTicketThreadAction] Error:', err);
    return { ticket: null, messages: [], isAdminViewer: false, error: err.message };
  }
}

/**
 * Posts a reply on a ticket.
 * Automatically identifies whether sender is Admin or Member,
 * updates ticket timestamps, and sends in-app notification to the counterpart.
 */
export async function postTicketReplyAction(
  ticketId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: 'Authentication required' };
  }

  if (!message || message.trim().length === 0) {
    return { success: false, error: 'Reply message cannot be empty' };
  }

  try {
    const adminClient = createAdminClient();
    const role = await getWebsiteUserRole(user.id, WEBSITE_ID);
    const isEnvAdmin = isUserAdmin(user.email);
    const isAdmin = role === 'admin' || Boolean(isEnvAdmin);

    // Verify ticket exists
    const { data: ticket, error: ticketErr } = await adminClient
      .from('bili_feedback')
      .select('id, user_id, title, status')
      .eq('id', ticketId)
      .eq('website_id', WEBSITE_ID)
      .single();

    if (ticketErr || !ticket) {
      return { success: false, error: 'Ticket not found' };
    }

    // Security check: non-admin can only reply to their own ticket
    if (!isAdmin && ticket.user_id !== user.id) {
      return { success: false, error: 'Unauthorized to reply to this ticket' };
    }

    const senderRole = isAdmin ? 'admin' : 'member';

    // 1. Insert message
    const { error: insertErr } = await adminClient
      .from('bili_feedback_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_role: senderRole,
        message: message.trim(),
      });

    if (insertErr) throw insertErr;

    // 2. Update parent ticket timestamp & status if needed
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    // If ticket was closed/resolved and member replies, reopen it
    if (!isAdmin && (ticket.status === 'resolved' || ticket.status === 'closed')) {
      updatePayload.status = 'open';
    }

    await adminClient
      .from('bili_feedback')
      .update(updatePayload)
      .eq('id', ticketId);

    // 3. Trigger In-App Notification to Counterpart
    const ticketTitle = ticket.title || 'Support Ticket';

    if (isAdmin) {
      // Admin replied -> Notify Member
      await sendMemberInAppNotification(
        ticket.user_id,
        'Support Team Replied',
        `Tenvi Support sent a response to "${ticketTitle}": "${message.slice(0, 80)}..."`,
        `/dashboard/support?id=${ticketId}`,
        'ticket_reply'
      );
    } else {
      // Member replied -> Notify Admins
      const memberName =
        (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Member';

      await notifyAdminsInAppNotification(
        `Reply from ${memberName}`,
        `Re: "${ticketTitle}": "${message.slice(0, 80)}..."`,
        `/admin/feedback?id=${ticketId}`,
        'ticket_reply'
      );
    }

    revalidatePath('/dashboard/support');
    revalidatePath('/admin/feedback');

    return { success: true };
  } catch (err: any) {
    console.error('[postTicketReplyAction] Error:', err);
    return { success: false, error: err.message || 'Failed to post reply' };
  }
}

/**
 * Admin action to retrieve feedback tickets with user metadata and message counts.
 */
export async function getAdminFeedbackAction(params?: {
  status?: string;
  type?: string;
}): Promise<{ items: SupportTicketRecord[]; error?: string }> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { items: [], error: 'Unauthorized' };
  }

  try {
    const admin = createAdminClient();
    let query = admin
      .from('bili_feedback')
      .select('*, bili_feedback_messages(count)')
      .eq('website_id', WEBSITE_ID)
      .order('updated_at', { ascending: false });

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    if (params?.type && params.type !== 'all') {
      query = query.eq('type', params.type);
    }

    const { data: tickets, error: ticketError } = await query;
    if (ticketError) throw ticketError;

    // Fetch user profiles for display
    const userIds = Array.from(new Set((tickets || []).map((t) => t.user_id)));
    let profileMap: Record<string, { email: string; full_name: string }> = {};

    if (userIds.length > 0) {
      const { data: profiles } = await admin
        .from('user_profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = { email: p.email, full_name: p.full_name };
      });
    }

    const enrichedItems: SupportTicketRecord[] = (tickets || []).map((t: any) => ({
      ...t,
      user_email: profileMap[t.user_id]?.email || 'Unknown User',
      user_name: profileMap[t.user_id]?.full_name || 'Member',
      messages_count: t.bili_feedback_messages?.[0]?.count || 0,
    }));

    return { items: enrichedItems };
  } catch (err: any) {
    console.error('[getAdminFeedbackAction] Error:', err);
    return { items: [], error: err.message || 'Failed to fetch feedback' };
  }
}

/**
 * Admin action to update ticket status and developer notes.
 * Automatically notifies the reporting member of status changes.
 */
export async function updateFeedbackStatusAction(
  id: string,
  status: FeedbackStatus,
  devNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const admin = createAdminClient();

    // Fetch ticket to get reporter user_id and title
    const { data: existingTicket } = await admin
      .from('bili_feedback')
      .select('user_id, title, status')
      .eq('id', id)
      .maybeSingle();

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (devNotes !== undefined) {
      updateData.dev_notes = devNotes;
    }

    if (status === 'resolved' || status === 'closed') {
      updateData.resolved_at = new Date().toISOString();
    } else {
      updateData.resolved_at = null;
    }

    const { error } = await admin
      .from('bili_feedback')
      .update(updateData)
      .eq('id', id)
      .eq('website_id', WEBSITE_ID);

    if (error) throw error;

    // If status changed, notify the member
    if (existingTicket && existingTicket.status !== status) {
      const statusLabel =
        status === 'in_progress'
          ? 'In Progress'
          : status === 'resolved'
          ? 'Resolved'
          : status === 'closed'
          ? 'Closed'
          : 'Open';

      await sendMemberInAppNotification(
        existingTicket.user_id,
        `Ticket Status: ${statusLabel}`,
        `Your ticket "${existingTicket.title || 'Support Request'}" has been marked as ${statusLabel}.`,
        `/dashboard/support?id=${id}`,
        'ticket_status'
      );
    }

    revalidatePath('/admin/feedback');
    revalidatePath('/dashboard/support');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update ticket' };
  }
}
