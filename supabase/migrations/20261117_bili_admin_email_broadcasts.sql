-- Migration: 20261117_bili_admin_email_broadcasts.sql
-- Description: Table for Admin Email Blasts & Broadcast Announcements to Members

CREATE TABLE IF NOT EXISTS public.bili_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL DEFAULT '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  category text NOT NULL CHECK (category IN ('feature_update', 'maintenance', 'announcement', 'security_notice')),
  message text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('all_members', 'admins_only', 'test_only')),
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  simulated_count integer NOT NULL DEFAULT 0,
  send_in_app boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_created 
  ON public.bili_broadcasts (website_id, created_at DESC);

ALTER TABLE public.bili_broadcasts ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_broadcasts' AND policyname = 'Admins have full access to broadcasts') THEN
    CREATE POLICY "Admins have full access to broadcasts"
      ON public.bili_broadcasts FOR ALL
      TO authenticated
      USING (public.is_admin(website_id, auth.uid()))
      WITH CHECK (public.is_admin(website_id, auth.uid()));
  END IF;
END $$;
