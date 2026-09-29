-- Migration: 20260927_notification_templates.sql
-- Description: Add editable notification templates for SMS and Email with dynamic variable support

ALTER TABLE public.bili_notification_settings
ADD COLUMN IF NOT EXISTS loan_sms_template text,
ADD COLUMN IF NOT EXISTS loan_email_subject text,
ADD COLUMN IF NOT EXISTS loan_email_body text,
ADD COLUMN IF NOT EXISTS card_sms_template text,
ADD COLUMN IF NOT EXISTS card_email_subject text,
ADD COLUMN IF NOT EXISTS card_email_body text;
