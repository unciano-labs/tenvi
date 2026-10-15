-- Migration: 20261111_bili_admin_members_rpc.sql
-- Description: Privacy-Preserving Operational Members Directory RPC for Tenvi

CREATE OR REPLACE FUNCTION public.get_admin_members_list(
  p_website_id uuid DEFAULT '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  p_search text DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_limit integer DEFAULT 25,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_banned boolean,
  banned_until timestamptz,
  accounts_count bigint,
  transactions_count bigint,
  properties_count bigint,
  loans_count bigint,
  credit_cards_count bigint,
  last_activity_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  -- 1. Security Check: Caller MUST be website admin or service_role
  IF current_user <> 'service_role' AND current_user <> 'postgres' AND NOT public.is_admin(p_website_id, auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Administrator access required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id AS user_id,
    u.email::text,
    COALESCE(up.full_name, split_part(u.email, '@', 1))::text AS full_name,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(u.banned_until > now(), false) AS is_banned,
    u.banned_until,
    -- Operational counts only (NO financial balances or values exposed)
    (SELECT count(*) FROM public.bili_savings s 
     WHERE s.user_id = u.id AND s.website_id = p_website_id AND s.deleted_at IS NULL) AS accounts_count,
    (SELECT count(*) FROM public.bili_transactions t 
     WHERE t.user_id = u.id AND t.website_id = p_website_id AND t.deleted_at IS NULL) AS transactions_count,
    (SELECT count(*) FROM public.bili_properties p 
     WHERE p.user_id = u.id AND p.website_id = p_website_id AND p.deleted_at IS NULL) AS properties_count,
    (SELECT count(*) FROM public.bili_loans l 
     WHERE l.user_id = u.id AND l.website_id = p_website_id AND l.deleted_at IS NULL) AS loans_count,
    (SELECT count(*) FROM public.bili_credit_cards c 
     WHERE c.user_id = u.id AND c.website_id = p_website_id AND c.deleted_at IS NULL) AS credit_cards_count,
    -- Last recorded activity timestamp
    (SELECT max(al.created_at) FROM public.bili_audit_logs al 
     WHERE al.user_id = u.id AND al.website_id = p_website_id::text) AS last_activity_at
  FROM auth.users u
  JOIN public.user_profiles up ON up.user_id = u.id
  JOIN public.user_roles ur ON ur.user_profile_id = up.id
  JOIN public.website_roles wr ON wr.id = ur.website_role_id
  WHERE wr.website_id = p_website_id
    AND wr.role IN ('member', 'user')
    AND (
      p_search IS NULL OR 
      u.email ILIKE '%' || p_search || '%' OR 
      up.full_name ILIKE '%' || p_search || '%'
    )
    AND (
      p_status = 'all' OR
      (p_status = 'active' AND (u.banned_until IS NULL OR u.banned_until <= now())) OR
      (p_status = 'suspended' AND u.banned_until > now())
    )
    AND (
      p_cursor_created_at IS NULL OR 
      (u.created_at, u.id) < (p_cursor_created_at, p_cursor_id)
    )
  ORDER BY u.created_at DESC, u.id DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_members_list(uuid, text, text, integer, timestamptz, uuid) TO authenticated, service_role;
