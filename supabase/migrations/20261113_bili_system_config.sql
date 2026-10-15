-- Migration: 20261113_bili_system_config.sql
-- Description: Dynamic System Config & Developer Settings for Tenvi

CREATE TABLE IF NOT EXISTS public.bili_system_config (
  key text PRIMARY KEY,
  website_id uuid NOT NULL DEFAULT '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bili_system_config ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public & authenticated read (needed for maintenance mode check and registration gate)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_system_config' AND policyname = 'Allow reading system config') THEN
    CREATE POLICY "Allow reading system config"
      ON public.bili_system_config FOR SELECT
      TO authenticated, anon
      USING (true);
  END IF;
END $$;

-- Policy 2: Only administrators can modify system config
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_system_config' AND policyname = 'Only admins can modify system config') THEN
    CREATE POLICY "Only admins can modify system config"
      ON public.bili_system_config FOR ALL
      TO authenticated
      USING (public.is_admin(website_id, auth.uid()))
      WITH CHECK (public.is_admin(website_id, auth.uid()));
  END IF;
END $$;

-- Pre-seed default configuration keys
INSERT INTO public.bili_system_config (key, value, description)
VALUES
  ('registration_gate', '{"mode": "open"}'::jsonb, 'Sign-up access mode: open, invite_only, closed'),
  ('maintenance_mode', '{"enabled": false, "read_only": false, "message": "Scheduled maintenance in progress. Please check back shortly."}'::jsonb, 'System maintenance switches'),
  ('maintenance_banner', '{"enabled": false, "message": "", "severity": "info"}'::jsonb, 'Global dashboard announcement banner'),
  ('ai_quotas', '{"daily_message_limit": 30, "model": "gemini-flash-latest", "allow_vision": true}'::jsonb, 'Tenvi AI consumption limits'),
  ('feature_flags', '{"ocr_statements": true, "open_banking": false, "fx_auto_sync": true}'::jsonb, 'Commercial feature availability toggles')
ON CONFLICT (key) DO NOTHING;
