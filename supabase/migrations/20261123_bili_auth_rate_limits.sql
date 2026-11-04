-- Migration: 20261123_bili_auth_rate_limits.sql
-- Description: Sliding-window rate limiting storage for authentication & registration security.

CREATE TABLE IF NOT EXISTS bili_auth_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Unique index on key so upserts / conflict resolutions are atomic and fast
CREATE UNIQUE INDEX IF NOT EXISTS idx_bili_auth_rate_limits_key ON bili_auth_rate_limits (key);
CREATE INDEX IF NOT EXISTS idx_bili_auth_rate_limits_expires_at ON bili_auth_rate_limits (expires_at);

-- RLS: Enabled, completely closed to public / anon (only service_role admin client can query/modify)
ALTER TABLE bili_auth_rate_limits ENABLE ROW LEVEL SECURITY;

