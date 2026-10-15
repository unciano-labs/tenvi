-- Migration: 20261110_bili_admin_security_definer.sql
-- Description: Admin Security Definer Functions & Two-Role RBAC Support for Tenvi

-- 1. Ensure 'admin' role exists for Tenvi website
INSERT INTO public.website_roles (website_id, role)
SELECT '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid, 'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.website_roles 
  WHERE website_id = '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid AND role = 'admin'
);

-- 2. Link admin user profiles to Tenvi admin role
DO $$
DECLARE
  v_tenvi_id uuid := '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid;
  v_admin_role_id uuid;
  r RECORD;
BEGIN
  SELECT id INTO v_admin_role_id 
  FROM public.website_roles 
  WHERE website_id = v_tenvi_id AND role = 'admin' 
  LIMIT 1;

  FOR r IN (
    SELECT id FROM public.user_profiles 
    WHERE email IN ('webcareer1+admin@gmail.com', 'webcareer1@gmail.com')
  ) LOOP
    INSERT INTO public.user_roles (user_profile_id, website_role_id)
    VALUES (r.id, v_admin_role_id)
    ON CONFLICT (user_profile_id, website_role_id) DO NOTHING;
  END LOOP;
END
$$;

-- 3. Security Definer Helper: is_admin
CREATE OR REPLACE FUNCTION public.is_admin(
  p_website_id uuid DEFAULT '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.user_profiles up ON up.id = ur.user_profile_id
    JOIN public.website_roles wr ON wr.id = ur.website_role_id
    WHERE up.user_id = p_user_id
      AND wr.website_id = p_website_id
      AND wr.role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid, uuid) TO authenticated, anon, service_role;

-- 4. Helper to get user website role
CREATE OR REPLACE FUNCTION public.get_user_website_role(
  p_website_id uuid DEFAULT '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN 'member';
  END IF;

  SELECT wr.role INTO v_role
  FROM public.user_roles ur
  JOIN public.user_profiles up ON up.id = ur.user_profile_id
  JOIN public.website_roles wr ON wr.id = ur.website_role_id
  WHERE up.user_id = p_user_id
    AND wr.website_id = p_website_id
  ORDER BY (CASE WHEN wr.role = 'admin' THEN 1 ELSE 2 END)
  LIMIT 1;

  IF v_role = 'user' THEN
    v_role := 'member';
  END IF;

  RETURN COALESCE(v_role, 'member');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_website_role(uuid, uuid) TO authenticated, anon, service_role;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_composite 
  ON public.user_roles (user_profile_id, website_role_id);

CREATE INDEX IF NOT EXISTS idx_website_roles_lookup 
  ON public.website_roles (website_id, role);
