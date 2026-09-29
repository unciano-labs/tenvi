-- Migration: 20260930_create_bili_user_onboarding.sql
-- Description: Multi-tenant user onboarding tracking for Tenvi

CREATE TABLE IF NOT EXISTS public.bili_user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  step INTEGER NOT NULL DEFAULT 1,
  dismissed_checklist BOOLEAN NOT NULL DEFAULT FALSE,
  has_added_account BOOLEAN NOT NULL DEFAULT FALSE,
  has_added_transaction BOOLEAN NOT NULL DEFAULT FALSE,
  has_added_card_or_loan BOOLEAN NOT NULL DEFAULT FALSE,
  has_tried_ai BOOLEAN NOT NULL DEFAULT FALSE,
  preferred_modules JSONB DEFAULT '["expenses", "cards"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_bili_user_onboarding_user_site UNIQUE (website_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_bili_user_onboarding_lookup
  ON public.bili_user_onboarding(website_id, user_id);

-- RLS
ALTER TABLE public.bili_user_onboarding ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bili_user_onboarding' AND policyname = 'Users can view their own onboarding status'
  ) THEN
    CREATE POLICY "Users can view their own onboarding status"
      ON public.bili_user_onboarding FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bili_user_onboarding' AND policyname = 'Users can insert their own onboarding status'
  ) THEN
    CREATE POLICY "Users can insert their own onboarding status"
      ON public.bili_user_onboarding FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bili_user_onboarding' AND policyname = 'Users can update their own onboarding status'
  ) THEN
    CREATE POLICY "Users can update their own onboarding status"
      ON public.bili_user_onboarding FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;
