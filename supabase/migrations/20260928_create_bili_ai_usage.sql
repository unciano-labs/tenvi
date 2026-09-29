-- Migration: Create bili_ai_usage table for tracking Gemini AI quota and consumption
CREATE TABLE IF NOT EXISTS public.bili_ai_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id text NOT NULL,
  user_id uuid NOT NULL,
  feature text NOT NULL DEFAULT 'statement_vision',
  model text NOT NULL DEFAULT 'gemini-flash-latest',
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  latency_ms integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bili_ai_usage_user_date ON public.bili_ai_usage(user_id, created_at);
ALTER TABLE public.bili_ai_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bili_ai_usage' AND policyname = 'bili_ai_usage_isolation'
  ) THEN
    CREATE POLICY bili_ai_usage_isolation ON public.bili_ai_usage
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;
