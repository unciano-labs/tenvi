import { cache } from 'react';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';

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
});

/**
 * Enforces that the current request is from an authenticated user who has an active
 * role for this website. For use in Server Actions, Route Handlers, and Server Components.
 */
export async function requireWebsiteUser(websiteId: string = WEBSITE_ID) {
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

  // Retrieve user role name for website (safely handle missing admin credentials)
  let roleName = 'user';
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createAdminClient();
      const { data: roleData } = await admin
        .from('user_roles')
        .select('website_roles(role)')
        .eq('user_profiles.user_id', user.id)
        .eq('website_roles.website_id', websiteId)
        .maybeSingle();

      roleName = (roleData?.website_roles as any)?.role || 'user';
    }
  } catch {
    roleName = 'user';
  }

  return {
    user,
    role: roleName,
    error: null,
    isAuthorized: true,
  };
}
