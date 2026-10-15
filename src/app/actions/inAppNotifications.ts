'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser } from '@/lib/auth/guards';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID, ADMIN_EMAIL } from '@/lib/constants';

export interface InAppNotification {
  id: string;
  website_id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  type: 'ticket_new' | 'ticket_reply' | 'ticket_status' | 'system';
  is_read: boolean;
  created_at: string;
}

/**
 * Retrieves the latest in-app notifications for the current authenticated user.
 */
export async function getInAppNotificationsAction(): Promise<{
  notifications: InAppNotification[];
  unreadCount: number;
  error?: string;
}> {
  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) {
    return { notifications: [], unreadCount: 0 };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('bili_in_app_notifications')
      .select('*')
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const notifications = (data as InAppNotification[]) || [];
    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return { notifications, unreadCount };
  } catch (err: any) {
    console.error('[getInAppNotificationsAction] Error:', err);
    return { notifications: [], unreadCount: 0, error: err.message };
  }
}

/**
 * Marks a specific notification as read.
 */
export async function markNotificationReadAction(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('bili_in_app_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Marks all notifications as read for the current user.
 */
export async function markAllNotificationsReadAction(): Promise<{
  success: boolean;
  error?: string;
}> {
  const {
    data: { user },
  } = await getAuthenticatedUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('bili_in_app_notifications')
      .update({ is_read: true })
      .eq('website_id', WEBSITE_ID)
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Dispatches an in-app notification to a specific member.
 */
export async function sendMemberInAppNotification(
  targetUserId: string,
  title: string,
  message: string,
  link: string,
  type: 'ticket_new' | 'ticket_reply' | 'ticket_status' | 'system' = 'ticket_update' as any
) {
  try {
    const admin = createAdminClient();
    await admin.from('bili_in_app_notifications').insert({
      website_id: WEBSITE_ID,
      user_id: targetUserId,
      title,
      message,
      link,
      type,
      is_read: false,
    });
  } catch (err) {
    console.error('[sendMemberInAppNotification] Failed to dispatch notification:', err);
  }
}

/**
 * Dispatches an in-app notification to all platform administrators.
 */
export async function notifyAdminsInAppNotification(
  title: string,
  message: string,
  link: string,
  type: 'ticket_new' | 'ticket_reply' = 'ticket_new'
) {
  try {
    const admin = createAdminClient();

    // 1. Query all users who have 'admin' role for this website
    const { data: adminRoles } = await admin
      .from('user_roles')
      .select('user_profiles!inner(user_id, email), website_roles!inner(role, website_id)')
      .eq('website_roles.website_id', WEBSITE_ID)
      .eq('website_roles.role', 'admin');

    const adminUserIds = new Set<string>();
    (adminRoles || []).forEach((r: any) => {
      if (r.user_profiles?.user_id) {
        adminUserIds.add(r.user_profiles.user_id);
      }
    });

    // 2. Also check if configured ADMIN_EMAIL has a profile
    if (adminUserIds.size === 0) {
      const { data: adminProfile } = await admin
        .from('user_profiles')
        .select('user_id')
        .ilike('email', ADMIN_EMAIL)
        .maybeSingle();

      if (adminProfile?.user_id) {
        adminUserIds.add(adminProfile.user_id);
      }
    }

    // 3. Insert notification for each admin
    const notificationsToInsert = Array.from(adminUserIds).map((userId) => ({
      website_id: WEBSITE_ID,
      user_id: userId,
      title,
      message,
      link,
      type,
      is_read: false,
    }));

    if (notificationsToInsert.length > 0) {
      await admin.from('bili_in_app_notifications').insert(notificationsToInsert);
    }
  } catch (err) {
    console.error('[notifyAdminsInAppNotification] Failed to alert admins:', err);
  }
}
