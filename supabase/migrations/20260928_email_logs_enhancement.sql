-- Migration: 20260928_email_logs_enhancement.sql
-- Description: Add email_subject and error_message to bili_notification_logs for comprehensive email log tracking

ALTER TABLE public.bili_notification_logs
ADD COLUMN IF NOT EXISTS email_subject text,
ADD COLUMN IF NOT EXISTS error_message text;

ALTER TABLE public.bili_notification_settings
ADD COLUMN IF NOT EXISTS smtp_email text,
ADD COLUMN IF NOT EXISTS smtp_app_password text;

