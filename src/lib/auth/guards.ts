import { cache } from 'react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID, isUserAdmin } from '@/lib/constants';

/**
 * Retrieves the currently authenticated Supabase user, memoized per request.
 * Prevents redundant auth API roundtrips when called in both layout.tsx and page.tsx.
 */
export const getAuthenticatedUser = cache(async () => {
  const supabase = await createClient();
  return await supabase.auth.getUser();
});

/**
 * Checks whether a specific user ID has an active membership/role for a given website.
 * Memoized per request using React cache().
 * Uses public.has_website_access RPC function with standard client first (SECURITY DEFINER),
 * falling back to admin client if available.
 */
export const checkUserWebsiteMembership = cache(
  async (userId: string, websiteId: string = WEBSITE_ID): Promise<boolean> => {
    return _checkWebsiteMembership(userId, websiteId);
  }
);

/**
 * Uncached version of checkUserWebsiteMembership.
 * Use this when you need a fresh DB hit within the same request — e.g., after
 * enrolling a user and verifying the enrollment actually took effect.
 */
export async function verifyWebsiteMembership(
  userId: string,
  websiteId: string = WEBSITE_ID
): Promise<boolean> {
  return _checkWebsiteMembership(userId, websiteId);
}

/**
 * Internal implementation shared by both cached and uncached membership checks.
 */
async function _checkWebsiteMembership(
  userId: string,
  websiteId: string = WEBSITE_ID
): Promise<boolean> {
    const targetWebsiteId = (websiteId || WEBSITE_ID)
      .trim()
      .replace(/^["']|["']$/g, '');

    if (!userId || !targetWebsiteId) {
      return false;
    }

  // 1. Primary check: call has_website_access RPC using standard client
  // Note: has_website_access is SECURITY DEFINER and executable by anon and authenticated
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('has_website_access', {
      p_website_id: targetWebsiteId,
      p_user_id: userId,
    });

    if (!error && typeof data === 'boolean') {
      return data;
    }
    if (error) {
      console.warn('Standard client has_website_access RPC returned error:', error.message);
    }
  } catch (clientErr) {
    console.warn('Standard client RPC execution error in checkUserWebsiteMembership:', clientErr);
  }

  // 2. Secondary check: call has_website_access RPC using admin client (if service role key is present)
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      const { data: adminData, error: adminErr } = await admin.rpc('has_website_access', {
        p_website_id: targetWebsiteId,
        p_user_id: userId,
      });

      if (!adminErr && typeof adminData === 'boolean') {
        return adminData;
      }

      // 3. Fallback direct relational query if RPC encounters issues
      const { data: roleRecord } = await admin
        .from('user_roles')
        .select('id, user_profiles!inner(user_id), website_roles!inner(website_id)')
        .eq('user_profiles.user_id', userId)
        .eq('website_roles.website_id', targetWebsiteId)
        .maybeSingle();

      if (roleRecord) {
        return true;
      }
    }
  } catch (adminErr) {
    console.warn('Admin client check error in checkUserWebsiteMembership:', adminErr);
  }

  return false;
}

export type UserRole = 'admin' | 'member';

export interface AuthGuardResult {
  user: any;
  role: UserRole | null;
  error: string | null;
  isAuthorized: boolean;
}

/**
 * Retrieves the current user's role for the website, memoized per request.
 * Normalizes legacy 'user' database role to canonical 'member'.
 */
export const getWebsiteUserRole = cache(
  async (userId: string, websiteId: string = WEBSITE_ID): Promise<UserRole> => {
    if (!userId) return 'member';

    const targetWebsiteId = (websiteId || WEBSITE_ID).trim().replace(/^["']|["']$/g, '');

    // 1. Primary check: Call get_user_website_role RPC
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('get_user_website_role', {
        p_website_id: targetWebsiteId,
        p_user_id: userId,
      });

      if (!error && data) {
        return data === 'admin' ? 'admin' : 'member';
      }
    } catch (rpcErr) {
      console.warn('[getWebsiteUserRole] RPC lookup error:', rpcErr);
    }

    // 2. Secondary check: Direct relational lookup using admin client
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const admin = createAdminClient();
        const { data: roleRecord } = await admin
          .from('user_roles')
          .select('website_roles!inner(role, website_id), user_profiles!inner(user_id)')
          .eq('user_profiles.user_id', userId)
          .eq('website_roles.website_id', targetWebsiteId)
          .maybeSingle();

        const rawRole = (roleRecord?.website_roles as any)?.role;
        if (rawRole === 'admin') return 'admin';
      }
    } catch (adminErr) {
      console.warn('[getWebsiteUserRole] Admin client fallback error:', adminErr);
    }

    return 'member';
  }
);

/**
 * Enforces that the incoming request is from an authorized website administrator.
 * Performs dual-layer validation:
 * 1. Checks session existence.
 * 2. Checks database role === 'admin' (via public.is_admin RPC or getWebsiteUserRole).
 * 3. Secondary fail-safe: checks env ADMIN_USER_ID or isUserAdmin(email).
 */
export async function requireWebsiteAdmin(websiteId: string = WEBSITE_ID): Promise<AuthGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      role: null,
      error: 'Unauthorized: Authentication required',
      isAuthorized: false,
    };
  }

  const targetWebsiteId = (websiteId || WEBSITE_ID).trim().replace(/^["']|["']$/g, '');

  // 1. Database is_admin RPC check
  let isDbAdmin = false;
  try {
    const { data, error } = await supabase.rpc('is_admin', {
      p_website_id: targetWebsiteId,
      p_user_id: user.id,
    });
    if (!error && typeof data === 'boolean') {
      isDbAdmin = data;
    }
  } catch (rpcErr) {
    console.warn('[requireWebsiteAdmin] is_admin RPC failed:', rpcErr);
  }

  // 2. Secondary checks: Role lookup & Environment fail-safes
  const dbRole = isDbAdmin ? 'admin' : await getWebsiteUserRole(user.id, targetWebsiteId);
  const isEnvAdminId = process.env.ADMIN_USER_ID && user.id === process.env.ADMIN_USER_ID.trim();
  const isEnvAdminEmail = isUserAdmin(user.email);

  const isAdmin = isDbAdmin || dbRole === 'admin' || Boolean(isEnvAdminId) || Boolean(isEnvAdminEmail);

  if (!isAdmin) {
    return {
      user,
      role: 'member',
      error: 'Forbidden: Administrator privileges required',
      isAuthorized: false,
    };
  }

  return {
    user,
    role: 'admin',
    error: null,
    isAuthorized: true,
  };
}

/**
 * Enforces that the current request is from an authenticated user who has an active
 * role for this website. For use in Server Actions, Route Handlers, and Server Components.
 */
export async function requireWebsiteUser(websiteId: string = WEBSITE_ID): Promise<AuthGuardResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      role: null,
      error: 'Unauthorized: Authentication required',
      isAuthorized: false,
    };
  }

  const isEnrolled = await checkUserWebsiteMembership(user.id, websiteId);
  if (!isEnrolled) {
    return {
      user: null,
      role: null,
      error: 'Forbidden: Account is not registered for this website',
      isAuthorized: false,
    };
  }

  const role = await getWebsiteUserRole(user.id, websiteId);

  return {
    user,
    role,
    error: null,
    isAuthorized: true,
  };
}

