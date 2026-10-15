-- Migration: 20261114_bili_analytics_schema.sql
-- Description: First-Party Privacy-Preserving Telemetry & Daily Rollup for Tenvi

CREATE TABLE IF NOT EXISTS public.bili_analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL DEFAULT '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  event_name text NOT NULL,
  session_hash text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  page_url text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  device_type text,
  browser text,
  is_pwa boolean DEFAULT false,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_created_event 
  ON public.bili_analytics_events (website_id, created_at DESC, event_name);

CREATE INDEX IF NOT EXISTS idx_analytics_session 
  ON public.bili_analytics_events (session_hash, created_at);

ALTER TABLE public.bili_analytics_events ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bili_analytics_events' AND policyname = 'Only admins can query analytics events') THEN
    CREATE POLICY "Only admins can query analytics events"
      ON public.bili_analytics_events FOR SELECT
      TO authenticated
      USING (public.is_admin(website_id, auth.uid()));
  END IF;
END $$;

-- Daily Rollup Table
CREATE TABLE IF NOT EXISTS public.bili_analytics_daily_rollup (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid NOT NULL DEFAULT '65d4f86e-1829-417a-981f-bc7aad7bc953'::uuid,
  event_date date NOT NULL,
  event_name text NOT NULL,
  utm_source text DEFAULT 'direct',
  device_type text DEFAULT 'unknown',
  is_pwa boolean DEFAULT false,
  total_events integer NOT NULL DEFAULT 0,
  unique_sessions integer NOT NULL DEFAULT 0,
  unique_users integer NOT NULL DEFAULT 0,
  CONSTRAINT uq_analytics_rollup UNIQUE (website_id, event_date, event_name, utm_source, device_type, is_pwa)
);

CREATE INDEX IF NOT EXISTS idx_analytics_daily_rollup_lookup
  ON public.bili_analytics_daily_rollup (website_id, event_date DESC, event_name);

-- Rollup refresh function
CREATE OR REPLACE FUNCTION public.refresh_analytics_daily_rollup(p_target_date date DEFAULT current_date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.bili_analytics_daily_rollup (
    website_id, event_date, event_name, utm_source, device_type, is_pwa, total_events, unique_sessions, unique_users
  )
  SELECT 
    e.website_id,
    e.created_at::date AS event_date,
    e.event_name,
    COALESCE(e.utm_source, 'direct') AS utm_source,
    COALESCE(e.device_type, 'desktop') AS device_type,
    e.is_pwa,
    count(*) AS total_events,
    count(DISTINCT e.session_hash) AS unique_sessions,
    count(DISTINCT e.user_id) FILTER (WHERE e.user_id IS NOT NULL) AS unique_users
  FROM public.bili_analytics_events e
  WHERE e.created_at::date = p_target_date
  GROUP BY e.website_id, e.created_at::date, e.event_name, COALESCE(e.utm_source, 'direct'), COALESCE(e.device_type, 'desktop'), e.is_pwa
  ON CONFLICT (website_id, event_date, event_name, utm_source, device_type, is_pwa)
  DO UPDATE SET
    total_events = excluded.total_events,
    unique_sessions = excluded.unique_sessions,
    unique_users = excluded.unique_users;
END;
$$;
