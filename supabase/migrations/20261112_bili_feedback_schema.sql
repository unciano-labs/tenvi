-- Migration: 20261112_bili_feedback_schema.sql
-- Description: Direct Member Feedback & Bug Reporting Schema for Tenvi

CREATE TABLE IF NOT EXISTS public.bili_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL DEFAULT '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('bug', 'feature', 'accounting_issue', 'ux_ui', 'other')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'wont_fix')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  message text NOT NULL,
  page_url text,
  device_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  dev_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_status_created 
  ON public.bili_feedback (website_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_user 
  ON public.bili_feedback (user_id);

ALTER TABLE public.bili_feedback ENABLE ROW LEVEL SECURITY;

-- Policy 1: Members can submit feedback
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_feedback' AND policyname = 'Members can insert feedback') THEN
    CREATE POLICY "Members can insert feedback"
      ON public.bili_feedback FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy 2: Members can view their own previously submitted feedback
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_feedback' AND policyname = 'Members can view their own feedback') THEN
    CREATE POLICY "Members can view their own feedback"
      ON public.bili_feedback FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy 3: Admins have full access
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_feedback' AND policyname = 'Admins have full feedback access') THEN
    CREATE POLICY "Admins have full feedback access"
      ON public.bili_feedback FOR ALL
      TO authenticated
      USING (public.is_admin(website_id, auth.uid()))
      WITH CHECK (public.is_admin(website_id, auth.uid()));
  END IF;
END $$;
