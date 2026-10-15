'use server';

import { revalidatePath } from 'next/cache';
import { requireWebsiteAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';

export interface AdminMemberRecord {
  user_id: string;
  email: string;
  full_name: string;
  created_at: string;
  last_sign_in_at: string | null;
  is_banned: boolean;
  banned_until: string | null;
  accounts_count: number;
  transactions_count: number;
  properties_count: number;
  loans_count: number;
  credit_cards_count: number;
  last_activity_at: string | null;
}

export interface AdminAuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string | null;
  created_at: string;
  summary?: string;
}

/**
 * Retrieves members directory using the privacy-safe RPC.
 */
export async function getAdminMembersAction(params?: {
  search?: string;
  status?: string;
  limit?: number;
  cursorCreatedAt?: string;
  cursorId?: string;
}): Promise<{ members: AdminMemberRecord[]; error?: string }> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { members: [], error: 'Unauthorized: Admin privileges required' };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('get_admin_members_list', {
      p_website_id: WEBSITE_ID,
      p_search: params?.search || null,
      p_status: params?.status || 'all',
      p_limit: params?.limit || 25,
      p_cursor_created_at: params?.cursorCreatedAt || null,
      p_cursor_id: params?.cursorId || null,
    });

    if (error) throw error;

    return {
      members: (data as AdminMemberRecord[]) || [],
    };
  } catch (err: any) {
    console.error('[getAdminMembersAction] Error:', err);
    return { members: [], error: err.message || 'Failed to load members' };
  }
}

/**
 * Suspends a member's login access.
 */
export async function suspendMemberAction(
  userId: string,
  durationHours: number,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!userId) {
    return { success: false, error: 'Target user ID is required' };
  }

  try {
    const admin = createAdminClient();
    const banDuration = durationHours > 0 ? `${durationHours}h` : '87600h'; // ~10 years for indefinite

    const { error: banError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: banDuration,
    });

    if (banError) throw banError;

    // Log the action to immutable audit logs
    await admin.from('bili_audit_logs').insert({
      website_id: WEBSITE_ID,
      user_id: auth.user.id,
      action: 'ADMIN_SUSPEND_USER',
      entity_type: 'user',
      entity_id: userId,
      new_data: { durationHours, reason },
    });

    revalidatePath('/admin/members');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to suspend account' };
  }
}

/**
 * Unsuspends a previously suspended member.
 */
export async function unsuspendMemberAction(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!userId) {
    return { success: false, error: 'Target user ID is required' };
  }

  try {
    const admin = createAdminClient();
    const { error: unbanError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: 'none',
    });

    if (unbanError) throw unbanError;

    await admin.from('bili_audit_logs').insert({
      website_id: WEBSITE_ID,
      user_id: auth.user.id,
      action: 'ADMIN_UNSUSPEND_USER',
      entity_type: 'user',
      entity_id: userId,
    });

    revalidatePath('/admin/members');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to unsuspend account' };
  }
}

/**
 * Triggers a password reset email for a member.
 */
export async function triggerMemberPasswordResetAction(
  userEmail: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!userEmail) {
    return { success: false, error: 'Email is required' };
  }

  try {
    const admin = createAdminClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tenvi.app';
    const { error } = await admin.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${appUrl}/auth/confirm?type=recovery`,
    });

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to send password reset' };
  }
}

/**
 * Removes a member from Tenvi (unlinks role).
 */
export async function deleteMemberAccountAction(
  userId: string,
  targetEmail: string
): Promise<{ success: boolean; error?: string }> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const admin = createAdminClient();

    // 1. Find profile ID
    const { data: profile } = await admin
      .from('user_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (profile) {
      // 2. Remove role for this website
      await admin
        .from('user_roles')
        .delete()
        .eq('user_profile_id', profile.id);
    }

    // 3. Log administrative deletion
    await admin.from('bili_audit_logs').insert({
      website_id: WEBSITE_ID,
      user_id: auth.user.id,
      action: 'ADMIN_UNLINK_MEMBER',
      entity_type: 'user',
      entity_id: userId,
      new_data: { targetEmail },
    });

    revalidatePath('/admin/members');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to remove member' };
  }
}

/**
 * Retrieves audit logs for a member to support debugging without leaking sensitive financial balances.
 */
export async function getMemberAuditLogsAction(
  targetUserId: string
): Promise<{ logs: AdminAuditLogEntry[]; error?: string }> {
  const auth = await requireWebsiteAdmin();
  if (!auth.isAuthorized || !auth.user) {
    return { logs: [], error: 'Unauthorized' };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('bili_audit_logs')
      .select('id, action, entity_type, entity_id, ip_address, created_at')
      .eq('user_id', targetUserId)
      .eq('website_id', WEBSITE_ID)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return {
      logs: (data as AdminAuditLogEntry[]) || [],
    };
  } catch (err: any) {
    return { logs: [], error: err.message || 'Failed to fetch audit logs' };
  }
}
