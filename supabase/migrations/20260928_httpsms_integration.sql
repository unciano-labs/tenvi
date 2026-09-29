-- Migration: 20260928_httpsms_integration.sql
-- Description: Add httpsms_api_key and httpsms_from_number to bili_notification_settings for live SMS gateway integration

ALTER TABLE public.bili_notification_settings
ADD COLUMN IF NOT EXISTS httpsms_api_key text,
ADD COLUMN IF NOT EXISTS httpsms_from_number text;
