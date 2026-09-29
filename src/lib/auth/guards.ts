import { createClient, createAdminClient } from '@/lib/supabase/server';
import { WEBSITE_ID } from '@/lib/constants';

/**
 * Checks whether a specific user ID has an active membership/role for a given website.
 * Uses public.has_website_access RPC function with admin client fallback.
 */
export async function checkUserWebsiteMembership(
  userId: string,
  websiteId: string = WEBSITE_ID
): Promise<boolean> {
  const admin = createAdminClient();

  const { data, error } = await admin.rpc('has_website_access', {
    p_website_id: websiteId,
    p_user_id: userId,
  });

  if (!error && typeof data === 'boolean') {
    return data;
  }

  // Fallback direct relational query if RPC encounters issues
  const { data: roleRecord } = await admin
    .from('user_roles')
    .select('id, user_profiles!inner(user_id), website_roles!inner(website_id)')
    .eq('user_profiles.user_id', userId)
    .eq('website_roles.website_id', websiteId)
    .maybeSingle();

  return Boolean(roleRecord);
}

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

  // Retrieve user role name for website
  const admin = createAdminClient();
  const { data: roleData } = await admin
    .from('user_roles')
    .select('website_roles(role)')
    .eq('user_profiles.user_id', user.id)
    .eq('website_roles.website_id', websiteId)
    .maybeSingle();

  const roleName = (roleData?.website_roles as any)?.role || 'user';

  return {
    user,
    role: roleName,
    error: null,
    isAuthorized: true,
  };
}
