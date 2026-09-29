-- Index on website_id, user_id, and created_at DESC for optimized pagination and fast logs retrieval
CREATE INDEX IF NOT EXISTS idx_bili_notification_logs_user_created ON public.bili_notification_logs (website_id, user_id, created_at DESC);
